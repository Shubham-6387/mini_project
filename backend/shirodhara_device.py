#!/usr/bin/env python3
"""
shirodhara_device.py - Raspberry Pi service for Shirodhara MVP (Firestore + Original Sensor Logic + Auto Mode)

- Connects to Firebase Cloud Firestore (matches Frontend)
- Uses EXACT sensor logic from original shirodhara2.py
- Sensor hardware sleeps when session is not active
- Auto Mode: Adjusts Flow/Temp based on therapeutic curve
- Auto Stop: Stops session after duration
- Robust Error Handling
"""

import time
import threading
import math
import random
import statistics
import os
import json
from datetime import datetime, timezone
import traceback

# Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

# =================== CONFIG ===================

DEVICE_ID = "pi-01"
SERVICE_ACCOUNT_FILE = "serviceAccountKey.json"

POLL_INTERVAL = 1.0
TELEMETRY_INTERVAL = 2.0
SENSOR_SAMPLE_INTERVAL = 0.02
WINDOW_SECONDS = 12.0

PULSE_MIN = 40
PULSE_MAX = 150
TEMP_MAX_SAFE = 48.0
FLOW_MIN_SAFE = 2.0

# =================== FIREBASE SETUP ===================

if not os.path.exists(SERVICE_ACCOUNT_FILE):
    print(f"CRITICAL ERROR: {SERVICE_ACCOUNT_FILE} not found!")
    db = None
else:
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Firebase Admin initialized successfully.")
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        db = None

# =================== GPIO (LEDs) ===================

USE_GPIO = False
try:
    import RPi.GPIO as GPIO
    USE_GPIO = True
    FLOW_PIN = 17
    TEMP_PIN = 27
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    GPIO.setup(FLOW_PIN, GPIO.OUT)
    GPIO.setup(TEMP_PIN, GPIO.OUT)
    flow_pwm = GPIO.PWM(FLOW_PIN, 100)
    temp_pwm = GPIO.PWM(TEMP_PIN, 100)
    flow_pwm.start(0)
    temp_pwm.start(0)
    print("GPIO LEDs enabled.")
except Exception as e:
    print("GPIO not available, LED simulation only:", e)
    USE_GPIO = False

def set_flow_led(value_ml_min: float):
    duty = max(0, min(100, int((value_ml_min / 200.0) * 100)))
    if USE_GPIO:
        try:
            flow_pwm.ChangeDutyCycle(duty)
        except Exception as e:
            print("flow PWM error:", e)

def set_temp_led(value_c: float):
    duty = max(0, min(100, int(((value_c - 30.0) / 20.0) * 100)))
    if USE_GPIO:
        try:
            temp_pwm.ChangeDutyCycle(duty)
        except Exception as e:
            print("temp PWM error:", e)

def turn_off_leds():
    if USE_GPIO:
        try:
            flow_pwm.ChangeDutyCycle(0)
            temp_pwm.ChangeDutyCycle(0)
        except Exception as e:
            print("LED off error:", e)

# =================== MAX30102 (HW) ===================

USE_SENSOR = True
sensor_ok = False
bus = None

try:
    import smbus2
except Exception as e:
    print("smbus2 not available, using simulation:", e)
    USE_SENSOR = False

# MAX30102 registers
I2C_BUS = 1
ADDRESS = 0x57
REG_INTR_ENABLE_1    = 0x02
REG_INTR_ENABLE_2    = 0x03
REG_FIFO_WR_PTR      = 0x04
REG_OVF_COUNTER      = 0x05
REG_FIFO_RD_PTR      = 0x06
REG_FIFO_DATA        = 0x07
REG_FIFO_CONFIG      = 0x08
REG_MODE_CONFIG      = 0x09
REG_SPO2_CONFIG      = 0x0A
REG_LED1_PA          = 0x0C
REG_LED2_PA          = 0x0D

def write_reg(reg, value):
    global bus
    if bus:
        try:
            bus.write_byte_data(ADDRESS, reg, value)
        except OSError:
            pass

def read_fifo_raw():
    global bus
    if not bus: return 0, 0
    try:
        data = bus.read_i2c_block_data(ADDRESS, REG_FIFO_DATA, 6)
        red = (data[0] << 16) | (data[1] << 8) | data[2]
        ir  = (data[3] << 16) | (data[4] << 8) | data[5]
        red &= 0x3FFFF
        ir  &= 0x3FFFF
        return red, ir
    except Exception:
        return 0, 0

def init_max30102_hw():
    """Initialize MAX30102 hardware."""
    global bus, sensor_ok
    if not USE_SENSOR:
        sensor_ok = False
        return False
    try:
        bus = smbus2.SMBus(I2C_BUS)
        # Reset
        write_reg(REG_MODE_CONFIG, 0x40)
        time.sleep(0.1)
        # Interrupts
        write_reg(REG_INTR_ENABLE_1, 0xC0)
        write_reg(REG_INTR_ENABLE_2, 0x00)
        # FIFO
        write_reg(REG_FIFO_WR_PTR, 0x00)
        write_reg(REG_OVF_COUNTER, 0x00)
        write_reg(REG_FIFO_RD_PTR, 0x00)
        write_reg(REG_FIFO_CONFIG, 0x4F)
        # SPO2
        write_reg(REG_SPO2_CONFIG, 0x27)
        # LED Current (Start with 0/Off until session starts)
        write_reg(REG_LED1_PA, 0x00) 
        write_reg(REG_LED2_PA, 0x00)
        # Mode
        write_reg(REG_MODE_CONFIG, 0x03)
        
        sensor_ok = True
        print("MAX30102 initialized (hardware OK).")
        return True
    except Exception as e:
        print("MAX30102 init failed, using simulation:", e)
        sensor_ok = False
        return False

def start_sensor_hw():
    """Wake up sensor and turn on LEDs"""
    if not sensor_ok: return
    print("Starting Sensor Hardware...")
    write_reg(REG_LED1_PA, 0x24) # ~7mA
    write_reg(REG_LED2_PA, 0x24)
    write_reg(REG_MODE_CONFIG, 0x03) # SPO2 Mode

def stop_sensor_hw():
    """Put sensor to sleep/turn off LEDs"""
    if not sensor_ok: return
    print("Stopping Sensor Hardware...")
    write_reg(REG_LED1_PA, 0x00)
    write_reg(REG_LED2_PA, 0x00)
    write_reg(REG_MODE_CONFIG, 0x80) # Shutdown mode

# =================== Sensor sampler (BPM) ===================

sensor_stop = False
ir_buffer = []
bpm = None
rr_intervals = []
session_active = False # Global flag

def compute_rmssd(rrs):
    if not rrs or len(rrs) < 2:
        return None
    diffs = [rrs[i] - rrs[i-1] for i in range(1, len(rrs))]
    sq = [d*d for d in diffs]
    rmssd = math.sqrt(sum(sq) / len(sq))
    return rmssd * 1000.0

def sensor_sampler():
    """Read MAX30102 if available, else simulated signal."""
    global sensor_stop, ir_buffer, bpm, rr_intervals, sensor_ok, session_active
    print("Sensor sampler started.")

    base_bpm = 72.0
    t0 = time.time()

    while not sensor_stop:
        # Only process if session is active
        if not session_active:
            time.sleep(0.5)
            # Clear buffer when inactive so we don't process old data
            if ir_buffer: 
                ir_buffer.clear()
                bpm = None
            continue

        t = time.time()
        ir = 0

        if sensor_ok:
            try:
                _, ir = read_fifo_raw()
            except Exception as e:
                print("MAX30102 read error:", e)
                sensor_ok = False

        if not sensor_ok:
            # simulated IR waveform
            phase = (t - t0) * (base_bpm / 60.0) * 2.0 * math.pi
            ir = int(50000 + 15000 * math.sin(phase) + random.gauss(0, 2000))

        # maintain buffer
        ir_buffer.append((t, ir))
        while ir_buffer and (t - ir_buffer[0][0]) > WINDOW_SECONDS:
            ir_buffer.pop(0)

        # compute peaks
        if len(ir_buffer) > 40:
            times = [x[0] for x in ir_buffer]
            vals = [x[1] for x in ir_buffer]

            sm = []
            for i in range(len(vals)):
                st = max(0, i-3)
                sm.append(sum(vals[st:i+1]) / (i - st + 1))

            if len(sm) > 1:
                meanv = statistics.mean(sm)
                stdv = statistics.pstdev(sm)
                thr = meanv + 0.4 * stdv

                peaks = []
                for i in range(1, len(sm)-1):
                    if sm[i] > thr and sm[i] > sm[i-1] and sm[i] >= sm[i+1]:
                        peaks.append(times[i])

                if len(peaks) >= 2:
                    diffs = [peaks[i] - peaks[i-1] for i in range(1, len(peaks))]
                    diffs = [d for d in diffs if 0.3 < d < 2.0]
                    if diffs:
                        avg_int = sum(diffs)/len(diffs)
                        bpm_val = 60.0/avg_int
                        bpm = round(bpm_val, 1)
                        rr_intervals = diffs[-20:]
            
        time.sleep(SENSOR_SAMPLE_INTERVAL)

# =================== Session state ===================

session_info = {} # {patient_id, session_id, ...}
stop_threads = False

# =================== Auto Mode Logic ===================

def apply_auto_mode(elapsed_sec, duration_sec, current_bpm):
    """Adjusts Flow and Temp based on therapeutic curve and BPM"""
    # Simple Therapeutic Curve:
    # 1. Warmup (10%): Ramp up
    # 2. Treatment (80%): Maintain Ideal + BPM Adjustment + Gentle Wave
    # 3. Cooldown (10%): Ramp down
    
    progress = elapsed_sec / duration_sec
    
    # Default targets
    target_temp = 38.0
    target_flow = 30.0
    
    # Use default BPM if None
    safe_bpm = current_bpm if current_bpm is not None else 72.0
    
    if progress < 0.1: # Warmup
        # Ramp Temp 37 -> 39
        target_temp = 37.0 + (progress * 10) * 2.0
        # Ramp Flow 20 -> 35
        target_flow = 20.0 + (progress * 10) * 15.0
    elif progress > 0.9: # Cooldown
        p_end = (progress - 0.9) * 10 # 0 to 1
        target_temp = 39.0 - (p_end * 2.0)
        target_flow = 35.0 - (p_end * 15.0)
    else: # Main Treatment
        # Base values
        base_temp = 38.0
        base_flow = 30.0
        
        # BPM Adjustment (Biofeedback Simulation)
        # Higher BPM (Stress) -> Higher Flow (Pressure) + Warmer Temp (Soothing)
        # Flow: +0.1 ml/min per BPM above 60 (Very subtle sensitivity)
        flow_offset = (safe_bpm - 60) * 0.1
        flow_offset = max(-2, min(5, flow_offset)) # Clamp offset to max +5
        
        # Temp: +0.05 C per BPM above 60
        temp_offset = (safe_bpm - 60) * 0.05
        temp_offset = max(-0.5, min(1.5, temp_offset)) # Clamp offset
        
        target_flow = base_flow + flow_offset
        target_temp = base_temp + temp_offset
        
        # Add gentle oscillation (Shirodhara rhythm)
        # Period ~ 15-20 seconds (Very slow wave)
        target_flow += 0.5 * math.sin(elapsed_sec / 5.0)
    
    return target_flow, target_temp

# =================== Firestore Helpers ===================

def emergency_stop(reason, value=None):
    global session_active, session_info
    print(f"EMERGENCY STOP: {reason} ({value})")
    
    # Stop hardware immediately
    session_active = False
    stop_sensor_hw()
    turn_off_leds()
    
    if db:
        alert = {
            "type": "emergency_stop",
            "level": "critical",
            "message": f"Emergency stop: {reason}",
            "value": value,
            "timestamp": firestore.SERVER_TIMESTAMP,
            "device_id": DEVICE_ID
        }
        db.collection("alerts").add(alert)
        
        pid = session_info.get("patient_id")
        sid = session_info.get("session_id")
        if pid and sid:
            try:
                db.collection("patients").document(pid).collection("sessions").document(sid).collection("alerts").add(alert)
                db.collection("patients").document(pid).collection("sessions").document(sid).update({
                    "status": "stopped_emergency",
                    "end_ts": firestore.SERVER_TIMESTAMP
                })
            except Exception as e:
                print(f"Error in emergency stop update: {e}")

    session_info.clear()

def finalize_session():
    global session_active, session_info
    print("Finalizing session...")
    
    # Stop hardware
    session_active = False
    stop_sensor_hw()
    turn_off_leds()

    pid = session_info.get("patient_id")
    sid = session_info.get("session_id")
    
    if pid and sid and db:
        try:
            db.collection("patients").document(pid).collection("sessions").document(sid).update({
                "status": "completed",
                "end_ts": firestore.SERVER_TIMESTAMP
            })
        except Exception as e:
            print(f"Error finalizing: {e}")

    session_info.clear()

# =================== Telemetry Loop ===================

def telemetry_loop():
    global stop_threads, session_active, session_info, bpm
    print("Telemetry loop started.")
    
    while not stop_threads:
        if not session_active or not db:
            time.sleep(1)
            continue

        try:
            # Auto Mode & Auto Stop Logic
            if 'local_start_ts' not in session_info:
                session_info['local_start_ts'] = time.time()
                
            elapsed = time.time() - session_info['local_start_ts']
            duration = session_info.get('duration_sec', 2700) # 45 mins default
            
            # Auto Stop
            if elapsed >= duration:
                print("Session time complete. Stopping.")
                finalize_session()
                continue

            # Auto Control
            if session_info.get('mode') == 'auto':
                af, at = apply_auto_mode(elapsed, duration, bpm)
                session_info['flow_value'] = af
                session_info['temp_value'] = at
                set_flow_led(af)
                set_temp_led(at)

            # Prepare data
            current_bpm = bpm if bpm is not None else 72.0
            spo2 = 98.0 + random.uniform(-1, 1)
            flow = session_info.get("flow_value", 30.0)
            temp = session_info.get("temp_value", 40.0)
            
            data = {
                "timestamp": firestore.SERVER_TIMESTAMP,
                "pulse": float(round(current_bpm, 1)),
                "spo2": float(round(spo2, 1)),
                "flowState": float(flow),
                "temperature": float(temp),
                "device_id": DEVICE_ID
            }

            pid = session_info.get("patient_id")
            sid = session_info.get("session_id")

            if pid and sid:
                try:
                    path = f"patients/{pid}/sessions/{sid}/telemetry"
                    print(f"Sending to {path}: Pulse={data['pulse']}")
                    db.collection("patients").document(pid).collection("sessions").document(sid).collection("telemetry").add(data)
                except Exception as e:
                    print(f"Error sending telemetry: {e}")
        except Exception as e:
            print(f"CRASH in telemetry loop: {e}")
            traceback.print_exc()

        time.sleep(TELEMETRY_INTERVAL)

# =================== Command Listener ===================

def on_command_snapshot(col_snapshot, changes, read_time):
    global session_active, session_info
    for change in changes:
        if change.type.name == 'ADDED':
            cmd_doc = change.document
            cmd_data = cmd_doc.to_dict()
            
            if cmd_data.get('ack'): continue
            
            # Check for stale commands (older than 5 mins)
            cmd_ts = cmd_data.get('timestamp')
            if cmd_ts:
                try:
                    if hasattr(cmd_ts, 'timestamp'):
                        ts_val = cmd_ts.timestamp()
                    elif hasattr(cmd_ts, 'seconds'):
                        ts_val = cmd_ts.seconds
                    else:
                        ts_val = time.time()
                    
                    if (time.time() - ts_val) > 300: # 5 minutes
                        print(f"Ignoring stale command: {cmd_data.get('cmd')} (Age: {int(time.time() - ts_val)}s)")
                        cmd_doc.reference.update({"ack": True, "error": "stale_command"})
                        continue
                except Exception as e:
                    print(f"Error checking timestamp: {e}")

            print(f"New command: {cmd_data.get('cmd')}")
            cmd_name = cmd_data.get('cmd')
            ack_data = {"ack": True, "processed_at": firestore.SERVER_TIMESTAMP}
            
            if cmd_name == 'start_session':
                if session_active:
                    ack_data['error'] = "Session already active"
                else:
                    pid = cmd_data.get('patientId')
                    sid = cmd_data.get('sessionId')
                    if pid and sid:
                        # Fetch session metadata to get duration/settings
                        try:
                            meta_ref = db.collection("patients").document(pid).collection("sessions").document(sid).collection("metadata").document("info")
                            meta_snap = meta_ref.get()
                            if meta_snap.exists:
                                meta_data = meta_snap.to_dict()
                                settings = meta_data.get('settings', {})
                                duration_mins = float(settings.get('duration', 45))
                                session_info['duration_sec'] = duration_mins * 60
                                session_info['mode'] = settings.get('mode', 'manual')
                                
                                # Get initial flow/temp from settings
                                initial_flow = float(settings.get('flowRate', 30.0))
                                initial_temp = float(settings.get('temperature', 40.0))
                                
                                print(f"Session started. Duration: {duration_mins} mins, Mode: {session_info['mode']}")
                                print(f"Initial Targets -> Flow: {initial_flow}, Temp: {initial_temp}")
                            else:
                                session_info['duration_sec'] = 45 * 60
                                session_info['mode'] = 'manual'
                                initial_flow = 30.0
                                initial_temp = 40.0
                        except Exception as e:
                            print(f"Error fetching metadata: {e}")
                            session_info['duration_sec'] = 45 * 60
                            session_info['mode'] = 'manual'
                            initial_flow = 30.0
                            initial_temp = 40.0

                        session_info['patient_id'] = pid
                        session_info['session_id'] = sid
                        session_info['local_start_ts'] = time.time()
                        
                        # Start everything
                        session_active = True
                        start_sensor_hw()
                        
                        # Initial values
                        session_info['flow_value'] = initial_flow
                        session_info['temp_value'] = initial_temp
                        
                        set_flow_led(initial_flow)
                        set_temp_led(initial_temp)
                        
                        db.collection("patients").document(pid).collection("sessions").document(sid).update({"status": "active"})
            
            elif cmd_name == 'stop_session':
                finalize_session()
                
            elif cmd_name == 'emergency_stop':
                emergency_stop("manual_command")
                
            elif cmd_name == 'set_flow':
                val = cmd_data.get('value')
                if val is not None:
                    session_info['flow_value'] = float(val)
                    session_info['mode'] = 'manual' # Override auto
                    set_flow_led(float(val))
                    
            elif cmd_name == 'set_temp':
                val = cmd_data.get('value')
                if val is not None:
                    session_info['temp_value'] = float(val)
                    session_info['mode'] = 'manual' # Override auto
                    set_temp_led(float(val))

            elif cmd_name == 'set_power':
                pass
            
            elif cmd_name == 'set_mode':
                 val = cmd_data.get('value') # 'auto' or 'manual'
                 if val:
                     session_info['mode'] = val
                     print(f"Mode set to {val}")

            cmd_doc.reference.update(ack_data)

def listen_for_commands():
    if not db: return
    commands_ref = db.collection("devices").document(DEVICE_ID).collection("commands")
    query = commands_ref.where("ack", "==", False)
    query.on_snapshot(on_command_snapshot)
    print("Listening for commands...")
    while not stop_threads:
        time.sleep(1)

# =================== Heartbeat ===================

def heartbeat_loop():
    global stop_threads
    print("Heartbeat loop started.")
    while not stop_threads:
        if db:
            try:
                db.collection("devices").document(DEVICE_ID).set({
                    "online": True,
                    "last_seen": firestore.SERVER_TIMESTAMP
                }, merge=True)
            except Exception as e:
                print(f"Heartbeat error: {e}")
        time.sleep(5) # Update every 5 seconds

# =================== MAIN ===================

def main():
    global stop_threads
    print("Starting Shirodhara Device Service (Hybrid + Auto)...")
    
    if not db:
        print("DB not initialized. Exiting.")
        return

    init_max30102_hw()

    t_sensor = threading.Thread(target=sensor_sampler, daemon=True)
    t_telemetry = threading.Thread(target=telemetry_loop, daemon=True)
    t_commands = threading.Thread(target=listen_for_commands, daemon=True)
    t_heartbeat = threading.Thread(target=heartbeat_loop, daemon=True)
    
    t_sensor.start()
    t_telemetry.start()
    t_commands.start()
    t_heartbeat.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping...")
        stop_threads = True
        stop_sensor_hw()
        turn_off_leds()
        time.sleep(1)

if __name__ == "__main__":
    main()
