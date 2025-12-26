import { useEffect, useState } from 'react';
import { onAuthState, signOutUser, getPatientMeta, type PatientData, getSessionSummary } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Navigation } from '../components/Navigation';
import { Footer } from '../components/Footer';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Activity, Clock, Heart, Thermometer } from 'lucide-react';

export default function PatientDashboard() {
    const [patient, setPatient] = useState<PatientData | null>(null);
    const [patientId, setPatientId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastSession, setLastSession] = useState<any>(null);

    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthState(async (currentUser) => {
            if (!currentUser) {
                navigate('/login');
                return;
            }

            // Get User Profile to find Patient ID
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.role !== 'patient' || !userData.patientId) {
                    alert('Access Denied: Not a patient account');
                    await signOutUser();
                    navigate('/login');
                    return;
                }

                setPatientId(userData.patientId);
                const patientData = await getPatientMeta(userData.patientId);
                setPatient(patientData);

                // Fetch last session summary if available
                // This is a bit tricky without a direct "last session" pointer, but we can query
                // For now, let's just leave it empty or implement a 'getLastSession' helper later
            } else {
                navigate('/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate]);

    const handleLogout = async () => {
        await signOutUser();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
            <Navigation />

            <main className="flex-grow container mx-auto px-6 py-24">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Patient Portal</h1>
                        <p className="text-gray-600 mt-1">Welcome back, {patient?.name}</p>
                    </div>
                    <Button variant="destructive" onClick={handleLogout}>
                        Logout
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Patient Info Card */}
                    <Card className="col-span-1 bg-white/80 backdrop-blur-sm shadow-md">
                        <CardHeader>
                            <CardTitle className="text-indigo-700">My Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">Name</span>
                                <span className="font-medium">{patient?.name}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">Age</span>
                                <span className="font-medium">{patient?.age}</span>
                            </div>
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-gray-500">Gender</span>
                                <span className="font-medium capitalize">{patient?.gender}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block mb-1">Medical Conditions</span>
                                <p className="bg-indigo-50 p-2 rounded text-sm text-gray-700">
                                    {patient?.medicalConditions || 'None listed'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions & Summary */}
                    <div className="col-span-1 md:col-span-2 space-y-6">
                        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-white">Your Treatment Journey</CardTitle>
                                <CardDescription className="text-indigo-100">
                                    Track your Shirodhara sessions and progress.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <Button
                                        onClick={() => navigate(`/patient/${patientId}/history`)}
                                        className="bg-white text-indigo-600 hover:bg-indigo-50 border-0"
                                    >
                                        <Clock className="mr-2 h-4 w-4" />
                                        View Session History
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="bg-transparent border-indigo-200 text-white hover:bg-white/10"
                                        disabled
                                    >
                                        <Activity className="mr-2 h-4 w-4" />
                                        View Progress Charts (Coming Soon)
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Card className="bg-white/80 backdrop-blur-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Last Session Stress Level</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-gray-900">--</div>
                                    <p className="text-xs text-gray-500">Calculated from HRV & Pulse</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/80 backdrop-blur-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Total Sessions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-gray-900">--</div>
                                    <p className="text-xs text-gray-500">Completed treatments</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
