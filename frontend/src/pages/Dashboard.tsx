import { useEffect, useState } from 'react';
import { onAuthState, signOutUser, getUserProfile, ensureUserProfile, getAllPatients, getPatientMeta, subscribeToDeviceStatus, startSession, toggleDevicePower, registerPatientUser, type UserData, type PatientData, type DeviceStatus } from '../lib/firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { type User } from 'firebase/auth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Slider } from '../components/ui/slider';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Navigation } from '../components/Navigation';
import { Footer } from '../components/Footer';

export default function Dashboard() {
    const [searchParams] = useSearchParams();
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserData | null>(null);
    const [patients, setPatients] = useState<Array<{ id: string, name: string, age: number }>>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>(searchParams.get('patientId') || '');
    const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
    const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({ last_seen: null, online: false });
    const [loading, setLoading] = useState(true);
    const [startingSession, setStartingSession] = useState(false);

    // Create Login State
    const [createLoginOpen, setCreateLoginOpen] = useState(false);
    const [newLoginEmail, setNewLoginEmail] = useState('');
    const [newLoginPassword, setNewLoginPassword] = useState('');
    const [creatingLogin, setCreatingLogin] = useState(false);

    // Session Configuration State
    const [therapyType, setTherapyType] = useState<string>('taila_dhara');
    const [duration, setDuration] = useState<number>(5);
    const [temperature, setTemperature] = useState<number>(37);
    const [flowRate, setFlowRate] = useState<number>(50);
    const [mode, setMode] = useState<'auto' | 'manual'>('manual');

    const navigate = useNavigate();

    const therapies = [
        { id: 'taila_dhara', name: 'Taila Dhara (Oil)', desc: 'Warm herbal oil pouring for stress & nervous system disorders.', defaultTemp: 38, defaultFlow: 40, defaultDuration: 5 },
        { id: 'ksheera_dhara', name: 'Ksheera Dhara (Milk)', desc: 'Medicated milk pouring for cooling & mental fatigue.', defaultTemp: 30, defaultFlow: 50, defaultDuration: 3 },
        { id: 'takra_dhara', name: 'Takra Dhara (Buttermilk)', desc: 'Medicated buttermilk for insomnia & skin issues.', defaultTemp: 28, defaultFlow: 60, defaultDuration: 5 },
        { id: 'jala_dhara', name: 'Jala Dhara (Water)', desc: 'Cool water pouring for pitta imbalance & heat.', defaultTemp: 25, defaultFlow: 70, defaultDuration: 10 },
        { id: 'kwatha_dhara', name: 'Kwatha Dhara (Decoction)', desc: 'Herbal decoction for therapeutic cleansing.', defaultTemp: 35, defaultFlow: 45, defaultDuration: 3 },
    ];

    const handleTherapyChange = (value: string) => {
        setTherapyType(value);
        const therapy = therapies.find(t => t.id === value);
        if (therapy) {
            setTemperature(therapy.defaultTemp);
            setFlowRate(therapy.defaultFlow);
            setDuration(therapy.defaultDuration);
        }
    };

    const handleTemperatureChange = (val: number) => {
        if (val > 45) {
            alert("Warning: Temperature is too high! Risk of burns.");
        } else if (val < 20) {
            alert("Warning: Temperature is too low! May cause discomfort.");
        }
        setTemperature(val);
    };

    const togglePower = async () => {
        try {
            const newPowerState = deviceStatus.power === 1 ? 0 : 1;
            await toggleDevicePower('pi-01', newPowerState);
        } catch (err) {
            alert("Failed to toggle power");
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthState(async (currentUser) => {

            if (!currentUser) {
                navigate('/login');
            } else {
                setUser(currentUser);
                let userProfile = await getUserProfile(currentUser.uid);

                // Auto-fix: If profile is missing, create it
                if (!userProfile) {
                    console.log('Profile missing, creating default therapist profile...');
                    userProfile = await ensureUserProfile(currentUser.uid, currentUser.email || '', currentUser.displayName || 'Therapist');
                }

                setProfile(userProfile);

                // Verify therapist role
                if (userProfile?.role !== 'therapist') {
                    const userRole = userProfile?.role || 'no role assigned';
                    alert(`Access denied. This dashboard is for therapists only.\n\nYour account role: ${userRole}\nRequired role: therapist\n\nPlease contact an administrator to update your role.`);
                    await signOutUser();
                    navigate('/login');
                    return;
                }

                // Load patients
                const patientsList = await getAllPatients();
                setPatients(patientsList);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate]);

    // Subscribe to device status
    useEffect(() => {
        const unsubscribe = subscribeToDeviceStatus('pi-01', (status) => {
            // TEMPORARY: Force device online as per user request
            setDeviceStatus({ ...status, online: true });
        });

        return () => unsubscribe();
    }, []);

    // Load selected patient data
    useEffect(() => {
        if (selectedPatientId) {
            getPatientMeta(selectedPatientId).then(setSelectedPatient);
        } else {
            setSelectedPatient(null);
        }
    }, [selectedPatientId]);

    const handleLogout = async () => {
        await signOutUser();
        navigate('/login');
    };

    const handleStartSession = async () => {
        if (!selectedPatientId || !user) {
            alert('Please select a patient first');
            return;
        }

        if (!deviceStatus.online) {
            alert('Device is offline. Cannot start session.');
            return;
        }

        setStartingSession(true);
        try {
            const sessionId = await startSession(selectedPatientId, user.uid, 'pi-01', {
                therapyType,
                duration,
                temperature,
                flowRate,
                mode
            });
            navigate(`/session/${sessionId}?patientId=${selectedPatientId}`);
        } catch (err: any) {
            alert('Error starting session: ' + err.message);
        } finally {
            setStartingSession(false);
        }
    };

    const handleCreatePatientLogin = async () => {
        if (!selectedPatientId || !newLoginEmail || !newLoginPassword) {
            alert('Please fill all fields');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newLoginEmail)) {
            alert('Please enter a valid email address (e.g., patient@example.com)');
            return;
        }

        if (newLoginPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        setCreatingLogin(true);
        try {
            await registerPatientUser(newLoginEmail, newLoginPassword, selectedPatientId);
            alert(`Login created for patient ${selectedPatientId}!\nEmail: ${newLoginEmail}\nPassword: ${newLoginPassword}`);
            setCreateLoginOpen(false);
            setNewLoginEmail('');
            setNewLoginPassword('');
        } catch (err: any) {
            console.error(err);
            alert('Failed to create login: ' + err.message);
        } finally {
            setCreatingLogin(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col">
            <Navigation />

            <main className="flex-grow container mx-auto px-6 py-24">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Therapist Dashboard</h1>
                        <p className="text-gray-600 mt-1">Welcome, {profile?.name}</p>
                    </div>
                    <Button variant="destructive" onClick={handleLogout}>
                        Logout
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Patient Selection */}
                    <Card className="lg:col-span-2 bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-xl text-orange-600">Patient Selection</CardTitle>
                            <CardDescription>Select a patient or add a new one</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Select Patient</label>
                                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a patient..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {patients.map((patient) => (
                                            <SelectItem key={patient.id} value={patient.id}>
                                                <span className="font-mono text-xs text-gray-500 mr-2">[{patient.id}]</span>
                                                <span className="font-medium">{patient.name}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => navigate('/book-session')}
                                className="w-full"
                            >
                                + Add New Patient
                            </Button>

                            {selectedPatientId && (
                                <Button
                                    variant="secondary"
                                    onClick={() => navigate(`/patient/${selectedPatientId}/history`)}
                                    className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700"
                                >
                                    View Patient History
                                </Button>
                            )}

                            {selectedPatient && (
                                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200 shadow-sm">
                                    <h3 className="font-semibold text-amber-900 mb-3 text-lg border-b border-amber-200 pb-2">Patient Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                        <div className="space-y-3">
                                            <div className="flex justify-between border-b border-amber-100 pb-1">
                                                <span className="font-medium text-gray-700">System ID:</span>
                                                <span className="font-mono text-gray-600 text-xs">{selectedPatientId}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-amber-100 pb-1">
                                                <span className="font-medium text-gray-700">ID Number:</span>
                                                <span className="text-gray-900">{selectedPatient.idNumber || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-amber-100 pb-1">
                                                <span className="font-medium text-gray-700">Name:</span>
                                                <span className="text-gray-900 font-medium">{selectedPatient.name}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-amber-100 pb-1">
                                                <span className="font-medium text-gray-700">Age:</span>
                                                <span className="text-gray-900">{selectedPatient.age}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-amber-100 pb-1">
                                                <span className="font-medium text-gray-700">Gender:</span>
                                                <span className="text-gray-900 capitalize">{selectedPatient.gender || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div>
                                                <span className="font-medium text-gray-700 block mb-1">Medical Conditions:</span>
                                                <p className="bg-white p-2 rounded border border-amber-100 text-gray-600 min-h-[40px]">
                                                    {selectedPatient.medicalConditions || 'None listed'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700 block mb-1">Health Notes:</span>
                                                <p className="bg-white p-2 rounded border border-amber-100 text-gray-600 min-h-[40px]">
                                                    {selectedPatient.healthNotes || 'None listed'}
                                                </p>
                                            </div>
                                            <div className="pt-1 flex items-center justify-between">
                                                <span className="font-medium text-gray-700">Consent Status:</span>
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${selectedPatient.consent ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                    {selectedPatient.consent ? 'Signed' : 'Not Signed'}
                                                </span>
                                            </div>

                                            <div className="pt-4 border-t border-amber-100 mt-2">
                                                <Dialog open={createLoginOpen} onOpenChange={setCreateLoginOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="w-full text-xs">
                                                            Enable Portal Access (Create Login)
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Create Patient Login</DialogTitle>
                                                            <DialogDescription>
                                                                Create credentials for <strong>{selectedPatient.name}</strong> to access the Patient Portal.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            <div className="space-y-2">
                                                                <Label>Email Address</Label>
                                                                <Input
                                                                    value={newLoginEmail}
                                                                    onChange={(e) => setNewLoginEmail(e.target.value)}
                                                                    placeholder="patient@example.com"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Password</Label>
                                                                <Input
                                                                    type="password"
                                                                    value={newLoginPassword}
                                                                    onChange={(e) => setNewLoginPassword(e.target.value)}
                                                                    placeholder="********"
                                                                />
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => setCreateLoginOpen(false)}>Cancel</Button>
                                                            <Button onClick={handleCreatePatientLogin} disabled={creatingLogin}>
                                                                {creatingLogin ? 'Creating...' : 'Create Login'}
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Device Status */}
                    <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
                        <CardHeader>
                            <CardTitle className="text-xl text-orange-600">Device Status</CardTitle>
                            <CardDescription>Raspberry Pi Monitor</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full ${!deviceStatus.online ? 'bg-red-500' :
                                        deviceStatus.power === 1 ? 'bg-green-500 animate-pulse' :
                                            'bg-orange-400'
                                        }`}></div>
                                    <div>
                                        <p className="font-medium">
                                            {!deviceStatus.online ? 'Device Offline' :
                                                deviceStatus.power === 1 ? 'Device Active' : 'Standby'}
                                        </p>
                                        <p className="text-xs text-gray-500">Device ID: pi-01</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="power-mode" className={`text-sm ${!selectedPatientId ? 'text-gray-400' : 'text-gray-600'}`}>Power</Label>
                                    <Switch
                                        id="power-mode"
                                        checked={deviceStatus.power === 1}
                                        onCheckedChange={togglePower}
                                        disabled={!selectedPatientId}
                                        className="data-[state=checked]:bg-green-500"
                                    />
                                </div>
                            </div>

                            {deviceStatus.last_seen && (
                                <p className="text-sm text-gray-600">
                                    Last seen: {new Date(deviceStatus.last_seen.toDate()).toLocaleTimeString()}
                                </p>
                            )}

                            {deviceStatus.firmware_version && (
                                <p className="text-sm text-gray-600">
                                    Firmware: v{deviceStatus.firmware_version}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Session Control */}
                <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl text-green-600">Session Configuration</CardTitle>
                        <CardDescription>Configure and start a new therapy session</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Therapy Selection */}
                            <div className="space-y-2">
                                <Label>Select Therapy Type</Label>
                                <Select value={therapyType} onValueChange={handleTherapyChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select therapy" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {therapies.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-gray-500 italic">
                                    {therapies.find(t => t.id === therapyType)?.desc}
                                </p>
                            </div>

                            {/* Mode Selection */}
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Operation Mode</Label>
                                    <p className="text-xs text-gray-500">
                                        {mode === 'auto' ? 'Device automatically adjusts flow & temp' : 'Manual control of flow & temp'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="mode-toggle" className={`text-sm ${mode === 'manual' ? 'text-orange-600 font-bold' : 'text-gray-400'}`}>Manual</Label>
                                    <Switch
                                        id="mode-toggle"
                                        checked={mode === 'auto'}
                                        onCheckedChange={(checked) => setMode(checked ? 'auto' : 'manual')}
                                        className="data-[state=checked]:bg-orange-500"
                                    />
                                    <Label htmlFor="mode-toggle" className={`text-sm ${mode === 'auto' ? 'text-orange-600 font-bold' : 'text-gray-400'}`}>Auto</Label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Duration */}
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Duration (minutes)</Label>
                                        <span className="text-xs text-orange-600 font-medium">
                                            Recommended: {therapies.find(t => t.id === therapyType)?.defaultDuration} min
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <Slider
                                                value={[[1, 3, 5, 10].indexOf(duration) !== -1 ? [1, 3, 5, 10].indexOf(duration) : 0]}
                                                onValueChange={(val) => {
                                                    const options = [1, 3, 5, 10];
                                                    setDuration(options[val[0]]);
                                                }}
                                                min={0}
                                                max={3}
                                                step={1}
                                                className="my-4"
                                            />
                                            <div className="flex justify-between px-1">
                                                {[1, 3, 5, 10].map((val) => (
                                                    <span
                                                        key={val}
                                                        className={`text-xs ${duration === val ? 'text-orange-600 font-bold' : 'text-gray-400'}`}
                                                    >
                                                        {val}m
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="w-16 text-center font-bold text-lg text-orange-600 border rounded-md py-1 bg-white">
                                            {duration}m
                                        </div>
                                    </div>
                                </div>

                                {/* Flow Rate */}
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Flow Rate (%)</Label>
                                        <span className="text-xs text-orange-600 font-medium">
                                            Recommended: {therapies.find(t => t.id === therapyType)?.defaultFlow}%
                                        </span>
                                    </div>
                                    <div className={`flex items-center gap-4 ${mode === 'auto' ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <div className="flex-1">
                                            <Slider
                                                value={[flowRate]}
                                                onValueChange={(val) => setFlowRate(val[0])}
                                                max={100}
                                                step={1}
                                                className="my-4"
                                            />
                                            <div className="flex justify-between px-1">
                                                <span className="text-xs text-gray-400">0%</span>
                                                <span className="text-xs text-gray-400">50%</span>
                                                <span className="text-xs text-gray-400">100%</span>
                                            </div>
                                        </div>
                                        <div className="w-20 text-center font-bold text-lg text-orange-600 border rounded-md py-1 bg-white">
                                            {flowRate}%
                                        </div>
                                    </div>
                                    {mode === 'auto' && <p className="text-xs text-orange-500">Controlled automatically</p>}
                                </div>
                            </div>

                            {/* Temperature */}
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Label>Temperature (°C)</Label>
                                    <span className="text-xs text-orange-600 font-medium">
                                        Recommended: {therapies.find(t => t.id === therapyType)?.defaultTemp}°C
                                    </span>
                                </div>
                                <div className={`flex items-center gap-4 ${mode === 'auto' ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <div className="flex-1">
                                        <Slider
                                            value={[temperature]}
                                            onValueChange={(val) => handleTemperatureChange(val[0])}
                                            min={20}
                                            max={50}
                                            step={0.5}
                                            className="my-4"
                                        />
                                        <div className="flex justify-between px-1">
                                            <span className="text-xs text-gray-400">20°C</span>
                                            <span className="text-xs text-gray-400">35°C</span>
                                            <span className="text-xs text-gray-400">50°C</span>
                                        </div>
                                    </div>
                                    <div className="w-20 text-center font-bold text-lg text-orange-600 border rounded-md py-1 bg-white">
                                        {temperature}°C
                                    </div>
                                </div>
                                {mode === 'auto' && <p className="text-xs text-orange-500">Controlled automatically</p>}
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                {!selectedPatientId && (
                                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm mb-4">
                                        ⚠️ Please select a patient to start a session
                                    </div>
                                )}

                                {selectedPatientId && !deviceStatus.online && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm mb-4">
                                        ❌ Device is offline. Cannot start session.
                                    </div>
                                )}

                                <Button
                                    onClick={handleStartSession}
                                    disabled={!selectedPatientId || !deviceStatus.online || startingSession}
                                    className={`w-full text-lg py-6 ${!selectedPatientId || !deviceStatus.online
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all'
                                        }`}
                                >
                                    {startingSession ? 'Starting Session...' : 'START SESSION'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main >

            <Footer />
        </div >
    );
}
