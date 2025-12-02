import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientMeta, getPatientSessions, getSessionSummary, type PatientData, type SessionMetadata, type SessionSummary } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Navigation } from '../components/Navigation';
import { Footer } from '../components/Footer';

export default function PatientHistory() {
    const { patientId } = useParams<{ patientId: string }>();
    const navigate = useNavigate();

    const [patient, setPatient] = useState<PatientData | null>(null);
    const [sessions, setSessions] = useState<Array<{ id: string, metadata: SessionMetadata, summary?: SessionSummary }>>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);

    useEffect(() => {
        if (!patientId) {
            navigate('/dashboard');
            return;
        }

        loadPatientData();
    }, [patientId, navigate]);

    const loadPatientData = async () => {
        if (!patientId) return;

        setLoading(true);
        try {
            // Load patient metadata
            const patientData = await getPatientMeta(patientId);
            setPatient(patientData);

            // Load session history
            const sessionsList = await getPatientSessions(patientId);

            // Load summaries for each session
            const sessionsWithSummaries = await Promise.all(
                sessionsList.map(async (session) => {
                    const summary = await getSessionSummary(session.id, patientId);
                    return { ...session, summary: summary || undefined };
                })
            );

            setSessions(sessionsWithSummaries);
        } catch (err) {
            console.error('Error loading patient data:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-50';
            case 'active': return 'text-blue-600 bg-blue-50';
            case 'stopping': return 'text-yellow-600 bg-yellow-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const handleDownloadReport = (session: any) => {
        const csvContent = [
            ['Patient Name', 'Date', 'Duration', 'Avg Pulse (BPM)', 'Avg SpO2 (%)', 'Max Temp (C)', 'Notes'],
            [
                patient?.name || 'Unknown',
                formatDate(session.metadata.start_ts),
                formatDuration(session.summary?.duration || 0),
                session.summary?.avgPulse || 'N/A',
                session.summary?.avgSpO2 || 'N/A',
                session.summary?.maxTemp || 'N/A',
                `"${session.summary?.notes || ''}"`
            ]
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session_report_${session.id}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Patient History</h1>
                        <p className="text-gray-600 mt-1">{patient?.name || 'Loading...'}</p>
                    </div>
                    <Button onClick={() => navigate(`/dashboard?patientId=${patientId}`)} variant="outline">
                        ← Back to Dashboard
                    </Button>
                </div>

                {/* Patient Info Card */}
                <Card className="mb-6 bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl text-orange-600">Patient Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Name</p>
                                <p className="font-medium">{patient?.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Age</p>
                                <p className="font-medium">{patient?.age} years</p>
                            </div>
                            {patient?.gender && (
                                <div>
                                    <p className="text-sm text-gray-600">Gender</p>
                                    <p className="font-medium capitalize">{patient.gender}</p>
                                </div>
                            )}
                            {patient?.healthNotes && (
                                <div className="md:col-span-3">
                                    <p className="text-sm text-gray-600">Health Notes</p>
                                    <p className="font-medium">{patient.healthNotes}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Session Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-orange-600">{sessions.length}</p>
                                <p className="text-sm text-gray-600 mt-1">Total Sessions</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-green-600">
                                    {sessions.filter(s => s.metadata.status === 'completed').length}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">Completed</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-blue-600">
                                    {sessions.filter(s => s.summary?.avgPulse).length > 0
                                        ? Math.round(
                                            sessions
                                                .filter(s => s.summary?.avgPulse)
                                                .reduce((acc, s) => acc + (s.summary?.avgPulse || 0), 0) /
                                            sessions.filter(s => s.summary?.avgPulse).length
                                        )
                                        : '--'}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">Avg Heart Rate</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 backdrop-blur-sm">
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-purple-600">
                                    {sessions.filter(s => s.summary?.relaxationIndex).length > 0
                                        ? (sessions
                                            .filter(s => s.summary?.relaxationIndex)
                                            .reduce((acc, s) => acc + (s.summary?.relaxationIndex || 0), 0) /
                                            sessions.filter(s => s.summary?.relaxationIndex).length
                                        ).toFixed(1)
                                        : '--'}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">Avg Relaxation</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Session List */}
                <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-xl text-blue-600">Session History</CardTitle>
                        <CardDescription>View all therapy sessions for this patient</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {sessions.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p className="text-lg">No sessions found</p>
                                <p className="text-sm mt-2">Start a new session from the dashboard</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${selectedSession === session.id
                                            ? 'border-orange-500 bg-orange-50'
                                            : 'border-gray-200 hover:border-orange-300'
                                            }`}
                                        onClick={() => setSelectedSession(selectedSession === session.id ? null : session.id)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold text-lg">Session {session.id.slice(-8)}</h3>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.metadata.status)}`}>
                                                        {session.metadata.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    Started: {formatDate(session.metadata.start_ts)}
                                                </p>
                                                {session.metadata.end_ts && (
                                                    <p className="text-sm text-gray-600">
                                                        Ended: {formatDate(session.metadata.end_ts)}
                                                    </p>
                                                )}
                                            </div>

                                            {session.summary && (
                                                <div className="grid grid-cols-3 gap-4 text-center">
                                                    <div>
                                                        <p className="text-xs text-gray-600">Duration</p>
                                                        <p className="font-semibold">{formatDuration(session.summary.duration)}</p>
                                                    </div>
                                                    {session.summary.avgPulse && (
                                                        <div>
                                                            <p className="text-xs text-gray-600">Avg Pulse</p>
                                                            <p className="font-semibold">{session.summary.avgPulse} BPM</p>
                                                        </div>
                                                    )}
                                                    {session.summary.relaxationIndex && (
                                                        <div>
                                                            <p className="text-xs text-gray-600">Relaxation</p>
                                                            <p className="font-semibold">{session.summary.relaxationIndex.toFixed(1)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Expanded Details */}
                                        {selectedSession === session.id && session.summary && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <h4 className="font-semibold mb-2">Session Details</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-600">Therapist ID</p>
                                                        <p className="font-mono text-xs">{session.metadata.therapist}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">Device ID</p>
                                                        <p className="font-mono text-xs">{session.metadata.deviceId}</p>
                                                    </div>
                                                    {session.summary.alerts && session.summary.alerts.length > 0 && (
                                                        <div className="md:col-span-2">
                                                            <p className="text-gray-600 mb-1">Alerts</p>
                                                            <ul className="list-disc list-inside space-y-1">
                                                                {session.summary.alerts.map((alert, idx) => (
                                                                    <li key={idx} className="text-red-600">{alert}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {session.summary.notes && (
                                                        <div className="md:col-span-2">
                                                            <p className="text-gray-600 mb-1">Notes</p>
                                                            <p className="text-gray-800">{session.summary.notes}</p>
                                                        </div>
                                                    )}
                                                    <div className="md:col-span-2 mt-2">
                                                        <Button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadReport(session);
                                                            }}
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full md:w-auto"
                                                        >
                                                            Download Report
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            <Footer />
        </div>
    );
}
