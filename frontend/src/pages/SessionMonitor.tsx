import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
    getPatientMeta,
    subscribeToTelemetry,
    subscribeToSessionHistory,
    subscribeToSessionStatus,
    subscribeToDeviceStatus,
    stopSession,
    emergencyStop,
    type PatientData,
    type Telemetry,
    type DeviceStatus
} from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Navigation } from '../components/Navigation';
import { Footer } from '../components/Footer';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function SessionMonitor() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get('patientId');
    const navigate = useNavigate();

    const [patient, setPatient] = useState<PatientData | null>(null);
    const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
    const [history, setHistory] = useState<Telemetry[]>([]);
    const [sessionTime, setSessionTime] = useState(0);
    const [stopping, setStopping] = useState(false);
    const [isSessionStopped, setIsSessionStopped] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionStatus, setCompletionStatus] = useState('');
    const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({ last_seen: null, online: false });

    const [relaxScore, setRelaxScore] = useState(50);

    useEffect(() => {
        if (!sessionId || !patientId) {
            navigate('/dashboard');
            return;
        }

        // Load patient data
        getPatientMeta(patientId).then(setPatient);

        // Subscribe to real-time telemetry (latest point)
        const unsubTelemetry = subscribeToTelemetry(sessionId, patientId, (data) => {
            setTelemetry(data);
            // Controls update removed
        });

        // Subscribe to session history (for charts)
        const unsubHistory = subscribeToSessionHistory(sessionId, patientId, (data) => {
            setHistory(data);
            setRelaxScore(computeRelaxScore(data));
        });

        // Subscribe to session status
        const unsubStatus = subscribeToSessionStatus(sessionId, patientId, (status) => {
            if (status === 'completed' || status === 'stopped_emergency' || status === 'stopped') {
                setIsSessionStopped(true);
                setCompletionStatus(status);
                setShowCompletionModal(true);
            }
        });

        // Subscribe to device status
        const unsubDevice = subscribeToDeviceStatus('pi-01', (status) => {
            setDeviceStatus(status);
        });

        // Session timer
        const timer = setInterval(() => {
            if (!isSessionStopped) {
                setSessionTime((prev) => prev + 1);
            }
        }, 1000);

        return () => {
            unsubTelemetry();
            unsubHistory();
            unsubStatus();
            unsubDevice();
            clearInterval(timer);
        };
    }, [sessionId, patientId, navigate, isSessionStopped]);

    const computeRelaxScore = (samples: Telemetry[]) => {
        if (!samples || samples.length === 0) return 50;
        const bpm = samples.map(s => s.pulse).filter(x => typeof x === 'number') as number[];
        if (bpm.length < 3) return 50;
        const start = bpm[0];
        const end = bpm[bpm.length - 1];
        const drop = Math.max(0, start - end);
        let score = 50 + Math.min(30, drop * 2);
        const last = samples[samples.length - 1];
        if (last && last.spo2 && last.spo2 > 96) score += 3;
        return Math.max(0, Math.min(100, Math.round(score)));
    };

    const getStatusEmoji = () => {
        if (!deviceStatus.online) return '🔌'; // Plug/Offline
        if (isSessionStopped) return '🏁'; // Checkered flag / Finished

        // If running, show relaxation score
        if (relaxScore >= 80) return '😌';
        if (relaxScore >= 60) return '🙂';
        if (relaxScore >= 40) return '😐';
        return '😟';
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

    const handleEmergencyStop = async () => {
        try {
            await emergencyStop('pi-01');
            alert('EMERGENCY STOP COMMAND SENT');
            setIsSessionStopped(true);
        } catch (err) {
            alert('Failed to send emergency stop');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Chart Data
    const labels = history.map(h => h.timestamp ? new Date(h.timestamp.toDate()).toLocaleTimeString() : '');

    const pulseChartData = {
        labels,
        datasets: [
            {
                label: 'Pulse (BPM)',
                data: history.map(h => h.pulse),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }
        ]
    };

    const flowTempChartData = {
        labels,
        datasets: [
            {
                label: 'Flow (ml/min)',
                data: history.map(h => h.flowState),
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 2,
                yAxisID: 'y',
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            },
            {
                label: 'Temp (°C)',
                data: history.map(h => h.temperature),
                borderColor: 'rgb(245, 158, 11)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 2,
                yAxisID: 'y1',
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top' as const,
                align: 'end' as const,
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    font: { size: 11 }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1f2937',
                bodyColor: '#4b5563',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                padding: 10,
                displayColors: true,
                callbacks: {
                    label: function (context: any) {
                        return context.dataset.label + ': ' + context.parsed.y;
                    }
                }
            }
        },
        scales: {
            x: {
                display: false,
                grid: { display: false }
            },
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                grid: {
                    color: 'rgba(0, 0, 0, 0.03)',
                    drawBorder: false,
                },
                border: { display: false },
                ticks: { font: { size: 10 }, color: 'rgb(34, 197, 94)' },
                title: { display: true, text: 'Flow (ml/min)', color: 'rgb(34, 197, 94)', font: { size: 10 } },
                suggestedMin: 0,
                suggestedMax: 60
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                grid: { display: false },
                border: { display: false },
                ticks: { font: { size: 10 }, color: 'rgb(245, 158, 11)' },
                title: { display: true, text: 'Temp (°C)', color: 'rgb(245, 158, 11)', font: { size: 10 } },
                suggestedMin: 30,
                suggestedMax: 45
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 text-gray-900 flex flex-col font-sans">
            <Navigation />

            <main className="flex-grow container mx-auto px-4 pt-24 pb-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Shirodhara — Smart Monitoring</h1>
                        <p className="text-gray-600 text-sm mt-1">Patient: {patient?.name || 'Loading...'} • Session: {sessionId}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="px-3 py-1 bg-white rounded-full border border-gray-200 text-sm shadow-sm text-gray-600">
                            Device: pi-01
                        </div>
                        <div className={`px-3 py-1 rounded-full border text-sm shadow-sm ${isSessionStopped ? 'bg-gray-100 border-gray-200 text-gray-600' : 'bg-green-50 border-green-200 text-green-700'}`}>
                            State: {isSessionStopped ? 'Stopped' : 'Running'}
                        </div>
                        <div className="text-3xl filter drop-shadow-sm transition-all duration-500 hover:scale-110" title="Status">
                            {getStatusEmoji()}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* LEFT COLUMN: Patient Info & Actions */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Patient Info Card */}
                        <Card className="bg-white/80 backdrop-blur-sm border-orange-100 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg text-orange-600">Patient Details</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                <div className="flex justify-between border-b border-gray-50 pb-1">
                                    <span className="text-gray-500">Name</span>
                                    <span className="font-medium">{patient?.name}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-50 pb-1">
                                    <span className="text-gray-500">Age</span>
                                    <span className="font-medium">{patient?.age}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Notes</span>
                                    <span className="truncate max-w-[150px] font-medium">{patient?.healthNotes || '—'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Session Actions Card */}
                        <Card className="bg-white/80 backdrop-blur-sm border-orange-100 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg text-orange-600">Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {isSessionStopped ? (
                                    <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full border-gray-300 hover:bg-gray-50 text-gray-700">
                                        Back to Dashboard
                                    </Button>
                                ) : (
                                    <Button variant="secondary" onClick={handleStopSession} disabled={stopping} className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800">
                                        Stop Session
                                    </Button>
                                )}
                                <Button variant="destructive" onClick={handleEmergencyStop} className="w-full bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg transition-all">
                                    EMERGENCY STOP
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN: Charts & Stats */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="bg-white/80 backdrop-blur-sm border-orange-100 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <div className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Time</div>
                                    <div className="text-3xl font-mono text-gray-800 mt-1">{formatTime(sessionTime)}</div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/80 backdrop-blur-sm border-orange-100 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <div className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Pulse</div>
                                    <div className="text-3xl font-mono text-red-500 mt-1">{telemetry?.pulse || '--'} <span className="text-sm text-gray-400 font-sans">BPM</span></div>
                                </CardContent>
                            </Card>
                            <Card className="bg-white/80 backdrop-blur-sm border-orange-100 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <div className="text-gray-400 text-xs uppercase tracking-wider font-semibold">SpO2</div>
                                    <div className="text-3xl font-mono text-blue-500 mt-1">{telemetry?.spo2 || '--'} <span className="text-sm text-gray-400 font-sans">%</span></div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="bg-white/80 backdrop-blur-sm border-orange-100 shadow-sm">
                                <CardHeader className="pb-2 border-b border-gray-50">
                                    <CardTitle className="text-sm text-gray-500 uppercase tracking-wider">Pulse History</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="h-[300px]">
                                        <Line options={chartOptions} data={pulseChartData} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white/80 backdrop-blur-sm border-orange-100 shadow-sm">
                                <CardHeader className="pb-2 border-b border-gray-50">
                                    <CardTitle className="text-sm text-gray-500 uppercase tracking-wider">Flow & Temp</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <div className="h-[300px]">
                                        <Line options={{
                                            ...chartOptions,
                                            scales: {
                                                ...chartOptions.scales,
                                                y: { ...chartOptions.scales.y, display: true, position: 'left' as const },
                                                y1: { ...chartOptions.scales.y1, display: true, position: 'right' as const, grid: { drawOnChartArea: false } },
                                            }
                                        }} data={flowTempChartData} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Session Summary Box */}
                        <Card className="bg-white/80 backdrop-blur-sm border-orange-100 shadow-sm">
                            <CardContent className="p-4 flex justify-between items-center">
                                <div>
                                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Session Summary</div>
                                    <div className="text-gray-700 mt-1 font-medium">
                                        Avg Pulse: {Math.round(history.reduce((a, b) => a + (b.pulse || 0), 0) / (history.length || 1))} bpm • Samples: {history.length}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Alerts</div>
                                    <div className="text-gray-500 mt-1 text-sm italic">No active alerts</div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            <Footer />

            <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className={completionStatus === 'stopped_emergency' ? 'text-red-600' : 'text-green-600'}>
                            {completionStatus === 'stopped_emergency' ? 'Session Emergency Stopped' : 'Session Completed'}
                        </DialogTitle>
                        <DialogDescription>
                            The session has ended. You can now return to the dashboard.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex flex-col">
                                <span className="text-gray-500">Duration</span>
                                <span className="font-medium">{formatTime(sessionTime)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-gray-500">Avg Pulse</span>
                                <span className="font-medium">
                                    {Math.round(history.reduce((a, b) => a + (b.pulse || 0), 0) / (history.length || 1))} bpm
                                </span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button type="button" variant="default" onClick={() => navigate('/dashboard')} className="w-full">
                            Return to Dashboard
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
