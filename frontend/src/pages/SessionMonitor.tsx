import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getPatientMeta, subscribeToTelemetry, stopSession, saveSessionSummary, type PatientData, type Telemetry } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Navigation } from '../components/Navigation';
import { Footer } from '../components/Footer';

export default function SessionMonitor() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patientId');
    const navigate = useNavigate();

    const [patient, setPatient] = useState<PatientData | null>(null);
    const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
    const [sessionTime, setSessionTime] = useState(0);
    const [stopping, setStopping] = useState(false);
    const [isSessionStopped, setIsSessionStopped] = useState(false);
    const [sessionHistory, setSessionHistory] = useState<Telemetry[]>([]);
    const [showReport, setShowReport] = useState(false);

    useEffect(() => {
        if (!sessionId || !patientId) {
            navigate('/dashboard');
            return;
        }

        // Load patient data
        getPatientMeta(patientId).then(setPatient);

        // Subscribe to telemetry
        const unsubscribe = subscribeToTelemetry(sessionId, patientId, (data) => {
            setTelemetry(data);
        });

        // Session timer
        const timer = setInterval(() => {
            if (!isSessionStopped) {
                setSessionTime((prev) => prev + 1);
            }
        }, 1000);

        return () => {
            unsubscribe();
            clearInterval(timer);
        };
    }, [sessionId, patientId, navigate, isSessionStopped]);

    // Virtualization & Safety Logic
    useEffect(() => {
        if (stopping || isSessionStopped) return;

        const interval = setInterval(() => {
            // Simulate data if no real telemetry
            const simulated: Telemetry = {
                timestamp: new Date(),
                pulse: Math.floor(60 + Math.random() * 40), // 60-100
                spo2: Math.floor(95 + Math.random() * 5),   // 95-100
                temperature: Number((36 + Math.random() * 2).toFixed(1)), // 36-38
                flowState: 'on'
            };
            setTelemetry(simulated);
            setSessionHistory(prev => [...prev, simulated]);

            // Safety Check
            if (simulated.pulse && (simulated.pulse > 110 || simulated.pulse < 50)) {
                handleAutoStop(`Abnormal Pulse detected: ${simulated.pulse} BPM`);
            }
            if (simulated.spo2 && simulated.spo2 < 90) {
                handleAutoStop(`Low SpO2 detected: ${simulated.spo2}%`);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [stopping, isSessionStopped]);

    const handleAutoStop = async (reason: string) => {
        if (stopping || isSessionStopped) return;
        alert(`CRITICAL ALERT: Stopping session automatically.\nReason: ${reason}`);
        await handleStopSession();
    };

    const handleStopSession = async () => {
        if (!sessionId || !patientId) return;

        setStopping(true);
        try {
            await stopSession(sessionId, patientId, 'pi-01');
            setIsSessionStopped(true);
        } catch (err: any) {
            alert('Error stopping session: ' + err.message);
        } finally {
            setStopping(false);
        }
    };

    const handleResume = () => {
        setIsSessionStopped(false);
        setShowReport(false);
    };

    const getSessionStats = () => {
        if (sessionHistory.length === 0) return { avgPulse: 0, avgSpO2: 0, maxTemp: 0 };
        const totalPulse = sessionHistory.reduce((acc, curr) => acc + (curr.pulse || 0), 0);
        const totalSpO2 = sessionHistory.reduce((acc, curr) => acc + (curr.spo2 || 0), 0);
        const maxTemp = Math.max(...sessionHistory.map(d => d.temperature || 0));

        return {
            avgPulse: Math.round(totalPulse / sessionHistory.length),
            avgSpO2: Math.round(totalSpO2 / sessionHistory.length),
            maxTemp
        };
    };

    const handleDownloadReport = () => {
        const stats = getSessionStats();
        const csvContent = [
            ['Patient Name', 'Date', 'Duration', 'Avg Pulse (BPM)', 'Avg SpO2 (%)', 'Max Temp (C)'],
            [
                patient?.name || 'Unknown',
                new Date().toLocaleDateString(),
                formatTime(sessionTime),
                stats.avgPulse,
                stats.avgSpO2,
                stats.maxTemp
            ]
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session_report_${sessionId}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleGenerateReport = async () => {
        if (!sessionId || !patientId) return;

        const stats = getSessionStats();
        setShowReport(true);

        // Save summary to database
        try {
            await saveSessionSummary(sessionId, patientId, {
                end_ts: new Date(),
                duration: sessionTime,
                avgPulse: stats.avgPulse,
                avgSpO2: stats.avgSpO2,
                maxTemp: stats.maxTemp,
                notes: 'Session stopped manually'
            });
        } catch (err) {
            console.error('Failed to save session summary:', err);
        }
    };

    const handleReturnToDashboard = () => {
        navigate('/dashboard');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col">
            <Navigation />

            <main className="flex-grow container mx-auto px-6 py-24">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Live Session Monitor</h1>
                    <p className="text-gray-600 mt-1">Patient: {patient?.name || 'Loading...'}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Session Timer */}
                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-xl text-orange-600">Session Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center">
                                <p className="text-5xl font-bold text-orange-600">{formatTime(sessionTime)}</p>
                                <p className="text-sm text-gray-600 mt-2">Minutes:Seconds</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pulse Monitor */}
                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-xl text-red-600">Heart Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center">
                                <p className="text-5xl font-bold text-red-600">
                                    {telemetry?.pulse || '--'}
                                </p>
                                <p className="text-sm text-gray-600 mt-2">BPM</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* SpO2 Monitor */}
                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-xl text-blue-600">Blood Oxygen</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center">
                                <p className="text-5xl font-bold text-blue-600">
                                    {telemetry?.spo2 || '--'}
                                </p>
                                <p className="text-sm text-gray-600 mt-2">SpO2 %</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Flow and Temperature */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-xl text-green-600">Oil Flow</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full ${telemetry?.flowState === 'on' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                <div>
                                    <p className="font-medium text-lg">{telemetry?.flowState === 'on' ? 'Flowing' : 'Stopped'}</p>
                                    <p className="text-sm text-gray-600">Flow Status</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-xl text-amber-600">Temperature</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center">
                                <p className="text-4xl font-bold text-amber-600">
                                    {telemetry?.temperature || '--'}°C
                                </p>
                                <p className="text-sm text-gray-600 mt-2">Oil Temperature</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Pulse Graph Placeholder */}
                <Card className="mt-6 bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl text-purple-600">Pulse Graph</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <p className="text-gray-500">Real-time pulse graph will be displayed here</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Control Panel */}
                <Card className="mt-6 bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl text-gray-800">Session Control</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isSessionStopped ? (
                            <>
                                <Button
                                    onClick={handleResume}
                                    disabled={showReport}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6 shadow-md font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    RESUME SESSION
                                </Button>

                                {!showReport ? (
                                    <Button
                                        onClick={handleGenerateReport}
                                        variant="outline"
                                        className="w-full text-lg py-6 shadow-sm"
                                    >
                                        Generate Session Result
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleReturnToDashboard}
                                        className="w-full bg-gray-800 hover:bg-gray-900 text-white text-lg py-6 shadow-md font-bold"
                                    >
                                        END SESSION
                                    </Button>
                                )}

                                {showReport && (
                                    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
                                        <h3 className="font-bold text-lg text-gray-800 mb-4 text-center">Session Result</h3>
                                        <div className="grid grid-cols-3 gap-4 text-center mb-6">
                                            <div className="p-3 bg-white rounded shadow-sm">
                                                <p className="text-xs text-gray-500 uppercase">Avg Pulse</p>
                                                <p className="text-xl font-bold text-red-600">{getSessionStats().avgPulse} BPM</p>
                                            </div>
                                            <div className="p-3 bg-white rounded shadow-sm">
                                                <p className="text-xs text-gray-500 uppercase">Avg SpO2</p>
                                                <p className="text-xl font-bold text-blue-600">{getSessionStats().avgSpO2} %</p>
                                            </div>
                                            <div className="p-3 bg-white rounded shadow-sm">
                                                <p className="text-xs text-gray-500 uppercase">Max Temp</p>
                                                <p className="text-xl font-bold text-amber-600">{getSessionStats().maxTemp} °C</p>
                                            </div>
                                        </div>
                                        <Button onClick={handleDownloadReport} variant="secondary" className="w-full">
                                            Download Result
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <Button
                                onClick={handleStopSession}
                                disabled={stopping}
                                className="w-full bg-red-700 hover:bg-red-800 text-white text-lg py-6 shadow-md font-bold"
                            >
                                FORCE STOP
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </main>

            <Footer />
        </div>
    );
}
