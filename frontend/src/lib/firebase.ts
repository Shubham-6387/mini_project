import { initializeApp, getApps, getApp } from "firebase/app";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    setPersistence,
    browserSessionPersistence,
    type User
} from "firebase/auth";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    collectionGroup,
    query,
    getDocs,
    onSnapshot,
    orderBy,
    limit,
    serverTimestamp
} from "firebase/firestore";

// ... (rest of imports)

// ... (previous code)

export async function createPatient(patientData: Omit<PatientData, 'createdAt' | 'createdBy'>, userId?: string) {
    if (!patientData.name || !patientData.age || !patientData.consent) {
        throw new Error('Missing required fields: name, age, and consent are required');
    }

    try {
        const patientRef = doc(db, 'patients', `patient_${Date.now()}`);
        const patientId = patientRef.id;

        // Create parent document to ensure it's not a phantom document
        await setDoc(patientRef, {
            created: serverTimestamp(),
            type: 'patient_root'
        });

        await setDoc(doc(db, 'patients', patientId, 'meta', 'info'), {
            ...patientData,
            createdAt: serverTimestamp(),
            createdBy: userId || 'system'
        });

        return patientId;
    } catch (err) {
        throw err;
    }
}

export async function getAllPatients() {
    try {
        // Use collectionGroup to find all 'meta' collections, which contain patient info
        // This works even if the parent 'patients' document is a phantom document
        const metaQuery = query(collectionGroup(db, 'meta'));
        const querySnapshot = await getDocs(metaQuery);

        const patients: Array<{ id: string, name: string, age: number }> = [];

        querySnapshot.forEach((docSnap) => {
            // We only care about the 'info' document in the meta collection
            if (docSnap.id === 'info') {
                const data = docSnap.data() as PatientData;
                // The parent of 'meta' collection is the patient document
                // path: patients/{patientId}/meta/info
                // docSnap.ref.parent is 'meta' collection
                // docSnap.ref.parent.parent is 'patients/{patientId}' document
                const patientId = docSnap.ref.parent.parent?.id;

                if (patientId) {
                    patients.push({
                        id: patientId,
                        name: data.name,
                        age: data.age
                    });
                }
            }
        });

        return patients;
    } catch (err) {
        console.error('Error getting patients:', err);
        return [];
    }
}

const firebaseConfig = {
    apiKey: "AIzaSyAaj0u3TeB3UCjveXUPF4gN0ErthptwKlc",
    authDomain: "shiropulse.firebaseapp.com",
    projectId: "shiropulse",
    storageBucket: "shiropulse.firebasestorage.app",
    messagingSenderId: "922857374750",
    appId: "1:922857374750:web:3ed0ea0982bcdbfe6d5a0f"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
// Set persistence to session only
setPersistence(auth, browserSessionPersistence).catch((error) => {
    console.error("Error setting persistence:", error);
});
const db = getFirestore(app);

export interface UserData {
    name: string;
    email: string;
    role: string;
    createdAt: any;
}

export interface PatientData {
    name: string;
    age: number;
    gender: string;
    healthNotes: string;
    medicalConditions: string;
    idNumber: string;
    consent: boolean;
    createdAt: any;
    createdBy: string;
}

export interface DeviceStatus {
    last_seen: any;
    online: boolean;
    firmware_version?: string;
    power?: number; // 0 for off, 1 for on
}

export interface SessionMetadata {
    start_ts: any;
    therapist: string;
    status: 'starting' | 'active' | 'stopping' | 'completed';
    patientId: string;
    deviceId: string;
    end_ts?: any;
}

export interface Telemetry {
    timestamp: any;
    pulse?: number;
    spo2?: number;
    flowState?: string;
    temperature?: number;
}

export interface SessionSummary {
    end_ts: any;
    duration: number;
    avgPulse?: number;
    avgSpO2?: number;
    maxTemp?: number;
    relaxationIndex?: number;
    alerts?: string[];
    notes?: string;
}

// ============ AUTHENTICATION FUNCTIONS ============

export async function registerUser({ name, email, password, role }: { name: string; email: string; password: string; role: string }) {
    if (!name || !email || !password || !role) throw new Error('Missing fields');
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;
        await setDoc(doc(db, 'users', uid), {
            name, email, role, createdAt: serverTimestamp()
        });
        return cred;
    } catch (err) {
        throw err;
    }
}

export async function login({ email, password }: { email: string; password: string }) {
    if (!email || !password) throw new Error('Missing email/password');
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return cred;
    } catch (err) {
        throw err;
    }
}

export async function resetPassword(email: string) {
    if (!email) throw new Error('Email is required');
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (err) {
        throw err;
    }
}

export async function signOutUser() {
    return await signOut(auth);
}

export async function getUserProfile(uid: string) {
    if (!uid) return null;
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() as UserData : null;
}

export async function ensureUserProfile(uid: string, email: string, name: string = 'Therapist') {
    if (!uid || !email) return null;

    try {
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            const newProfile = {
                name,
                email,
                role: 'therapist',
                createdAt: serverTimestamp()
            };
            await setDoc(userRef, newProfile);
            return newProfile as UserData;
        }

        return snap.data() as UserData;
    } catch (err) {
        console.error('Error ensuring user profile:', err);
        return null;
    }
}

export function onAuthState(cb: (user: User | null) => void) {
    return onAuthStateChanged(auth, cb);
}

// ============ PATIENT MANAGEMENT FUNCTIONS ============

export async function searchPatientByName(name: string) {
    if (!name) return null;

    try {
        const patientsRef = collection(db, 'patients');
        const q = query(patientsRef);
        const querySnapshot = await getDocs(q);

        for (const patientDoc of querySnapshot.docs) {
            const metaRef = doc(db, 'patients', patientDoc.id, 'meta', 'info');
            const metaSnap = await getDoc(metaRef);

            if (metaSnap.exists()) {
                const data = metaSnap.data() as PatientData;
                if (data.name.toLowerCase() === name.toLowerCase()) {
                    return {
                        id: patientDoc.id,
                        ...data
                    };
                }
            }
        }

        return null;
    } catch (err) {
        console.error('Error searching patient by name:', err);
        return null;
    }
}

export async function searchPatientById(patientId: string) {
    if (!patientId) return null;

    try {
        const metaRef = doc(db, 'patients', patientId, 'meta', 'info');
        const metaSnap = await getDoc(metaRef);

        if (metaSnap.exists()) {
            return {
                id: patientId,
                ...metaSnap.data() as PatientData
            };
        }

        return null;
    } catch (err) {
        console.error('Error searching patient by ID:', err);
        return null;
    }
}





export async function getPatientMeta(patientId: string) {
    if (!patientId) return null;

    try {
        const metaRef = doc(db, 'patients', patientId, 'meta', 'info');
        const metaSnap = await getDoc(metaRef);

        if (metaSnap.exists()) {
            return metaSnap.data() as PatientData;
        }
        return null;
    } catch (err) {
        console.error('Error getting patient meta:', err);
        return null;
    }
}

export async function getPatientSessions(patientId: string) {
    if (!patientId) return [];

    try {
        const sessionsRef = collection(db, 'patients', patientId, 'sessions');
        const q = query(sessionsRef, orderBy('start_ts', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);

        const sessions: Array<{ id: string, metadata: SessionMetadata }> = [];

        for (const sessionDoc of querySnapshot.docs) {
            const metadataRef = doc(db, 'patients', patientId, 'sessions', sessionDoc.id, 'metadata', 'info');
            const metadataSnap = await getDoc(metadataRef);

            if (metadataSnap.exists()) {
                sessions.push({
                    id: sessionDoc.id,
                    metadata: metadataSnap.data() as SessionMetadata
                });
            }
        }

        return sessions;
    } catch (err) {
        console.error('Error getting patient sessions:', err);
        return [];
    }
}

// ============ DEVICE MANAGEMENT FUNCTIONS ============

export async function getDeviceStatus(deviceId: string = 'pi-01') {
    try {
        const statusRef = doc(db, 'devices', deviceId, 'status', 'current');
        const statusSnap = await getDoc(statusRef);

        if (statusSnap.exists()) {
            const data = statusSnap.data() as DeviceStatus;

            const lastSeen = data.last_seen?.toDate?.() || new Date(0);
            const now = new Date();
            const diffSeconds = (now.getTime() - lastSeen.getTime()) / 1000;

            return {
                ...data,
                online: diffSeconds < 30
            };
        }

        return { last_seen: null, online: false };
    } catch (err) {
        console.error('Error getting device status:', err);
        return { last_seen: null, online: false };
    }
}

export function subscribeToDeviceStatus(deviceId: string = 'pi-01', callback: (status: DeviceStatus) => void) {
    const statusRef = doc(db, 'devices', deviceId, 'status', 'current');

    return onSnapshot(statusRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data() as DeviceStatus;
            const lastSeen = data.last_seen?.toDate?.() || new Date(0);
            const now = new Date();
            const diffSeconds = (now.getTime() - lastSeen.getTime()) / 1000;

            callback({
                ...data,
                online: diffSeconds < 30
            });
        } else {
            callback({ last_seen: null, online: false });
        }
    });
}

// ============ SESSION MANAGEMENT FUNCTIONS ============

export async function startSession(patientId: string, therapistId: string, deviceId: string = 'pi-01', settings?: any) {
    if (!patientId || !therapistId) {
        throw new Error('Patient ID and Therapist ID are required');
    }

    try {
        const sessionId = `sess_${Date.now()}`;

        // Create parent session document first (so queries work)
        const sessionRef = doc(db, 'patients', patientId, 'sessions', sessionId);
        await setDoc(sessionRef, {
            start_ts: serverTimestamp(),
            status: 'starting',
            created: serverTimestamp()
        });

        // Create metadata subcollection
        const metadataRef = doc(db, 'patients', patientId, 'sessions', sessionId, 'metadata', 'info');
        await setDoc(metadataRef, {
            start_ts: serverTimestamp(),
            therapist: therapistId,
            status: 'starting',
            patientId,
            deviceId,
            settings: settings || {}
        } as SessionMetadata);

        const cmdId = `cmd_${Date.now()}`;
        const commandRef = doc(db, 'devices', deviceId, 'commands', cmdId);
        await setDoc(commandRef, {
            cmd: 'start_session',
            sessionId,
            patientId,
            timestamp: serverTimestamp(),
            ack: false
        });

        return sessionId;
    } catch (err) {
        console.error('Error starting session:', err);
        throw err;
    }
}

export async function stopSession(sessionId: string, patientId: string, deviceId: string = 'pi-01') {
    if (!sessionId || !patientId) {
        throw new Error('Session ID and Patient ID are required');
    }

    try {
        // Update parent session document
        const sessionRef = doc(db, 'patients', patientId, 'sessions', sessionId);
        await setDoc(sessionRef, {
            end_ts: serverTimestamp(),
            status: 'stopping'
        }, { merge: true });

        // Update metadata subcollection
        const metadataRef = doc(db, 'patients', patientId, 'sessions', sessionId, 'metadata', 'info');
        await setDoc(metadataRef, {
            status: 'stopping',
            end_ts: serverTimestamp()
        }, { merge: true });

        const cmdId = `cmd_${Date.now()}`;
        const commandRef = doc(db, 'devices', deviceId, 'commands', cmdId);
        await setDoc(commandRef, {
            cmd: 'stop_session',
            sessionId,
            patientId,
            timestamp: serverTimestamp(),
            ack: false
        });

        return true;
    } catch (err) {
        console.error('Error stopping session:', err);
        throw err;
    }
}

export function subscribeToTelemetry(sessionId: string, patientId: string, callback: (data: Telemetry) => void) {
    const telemetryRef = collection(db, 'patients', patientId, 'sessions', sessionId, 'telemetry');
    const q = query(telemetryRef, orderBy('timestamp', 'desc'), limit(1));

    return onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                callback(change.doc.data() as Telemetry);
            }
        });
    });
}

export async function getSessionSummary(sessionId: string, patientId: string) {
    try {
        const summaryRef = doc(db, 'patients', patientId, 'sessions', sessionId, 'summary', 'final');
        const summarySnap = await getDoc(summaryRef);

        if (summarySnap.exists()) {
            return summarySnap.data() as SessionSummary;
        }
        return null;
    } catch (err) {
        console.error('Error getting session summary:', err);
        return null;
    }
}

export async function saveSessionSummary(sessionId: string, patientId: string, summary: SessionSummary) {
    if (!sessionId || !patientId) throw new Error('Session ID and Patient ID are required');

    try {
        const summaryRef = doc(db, 'patients', patientId, 'sessions', sessionId, 'summary', 'final');
        await setDoc(summaryRef, summary);
        return true;
    } catch (err) {
        console.error('Error saving session summary:', err);
        throw err;
    }
}

export async function toggleDevicePower(deviceId: string = 'pi-01', powerState: number) {
    try {
        const statusRef = doc(db, 'devices', deviceId, 'status', 'current');
        // Update the status directly
        await setDoc(statusRef, {
            power: powerState,
            last_updated: serverTimestamp()
        }, { merge: true });

        // Also send a command to the device
        const cmdId = `cmd_${Date.now()}`;
        const commandRef = doc(db, 'devices', deviceId, 'commands', cmdId);
        await setDoc(commandRef, {
            cmd: 'set_power',
            power: powerState,
            timestamp: serverTimestamp(),
            ack: false
        });

        return true;
    } catch (err) {
        console.error('Error toggling device power:', err);
        throw err;
    }
}

export async function emergencyStop(deviceId: string = 'pi-01') {
    try {
        const cmdId = `cmd_${Date.now()}`;
        const commandRef = doc(db, 'devices', deviceId, 'commands', cmdId);
        await setDoc(commandRef, {
            cmd: 'emergency_stop',
            issued_by: 'therapist',
            timestamp: serverTimestamp(),
            ack: false
        });
        return true;
    } catch (err) {
        console.error('Error sending emergency stop:', err);
        throw err;
    }
}

export async function sendDeviceCommand(deviceId: string = 'pi-01', command: string, value: any) {
    try {
        const cmdId = `cmd_${Date.now()}`;
        const commandRef = doc(db, 'devices', deviceId, 'commands', cmdId);
        await setDoc(commandRef, {
            cmd: command,
            value: value,
            issued_by: 'therapist',
            timestamp: serverTimestamp(),
            ack: false
        });
        return cmdId;
    } catch (err) {
        console.error(`Error sending command ${command}:`, err);
        throw err;
    }
}

export function subscribeToSessionHistory(sessionId: string, patientId: string, callback: (data: Telemetry[]) => void) {
    const telemetryRef = collection(db, 'patients', patientId, 'sessions', sessionId, 'telemetry');
    // Get last 120 points for charts
    const q = query(telemetryRef, orderBy('timestamp', 'desc'), limit(120));

    return onSnapshot(q, (snapshot) => {
        const history: Telemetry[] = [];
        snapshot.forEach((doc) => {
            history.push(doc.data() as Telemetry);
        });
        // Reverse to have chronological order for charts
        callback(history.reverse());
    });
}

export function subscribeToSessionStatus(sessionId: string, patientId: string, callback: (status: string) => void) {
    // Listen to the parent session document instead of metadata/info
    // This is more robust as the device script updates this document directly
    const sessionRef = doc(db, 'patients', patientId, 'sessions', sessionId);

    return onSnapshot(sessionRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data() as { status: string };
            callback(data.status);
        }
    });
}

export { app, auth, db };
