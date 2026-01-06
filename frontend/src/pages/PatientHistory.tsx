import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientMeta, getPatientSessions, getSessionSummary, updateSessionNotes, onAuthState, getUserProfile, type PatientData, type SessionMetadata, type SessionSummary } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Navigation } from '../components/Navigation';
import { Footer } from '../components/Footer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

export default function PatientHistory() {
    const { patientId } = useParams<{ patientId: string }>();
    const navigate = useNavigate();

    const [patient, setPatient] = useState<PatientData | null>(null);
    const [sessions, setSessions] = useState<Array<{ id: string, metadata: SessionMetadata, summary?: SessionSummary }>>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [isTherapist, setIsTherapist] = useState(false);

    // Editing Notes Logic
    const [editingSession, setEditingSession] = useState<string | null>(null);
    const [notesBuffer, setNotesBuffer] = useState('');
    const [savingNotes, setSavingNotes] = useState(false);

    useEffect(() => {
        const checkRole = async () => {
            const unsubscribe = onAuthState(async (user) => {
                if (user) {
                    const profile = await getUserProfile(user.uid);
                    setIsTherapist(profile?.role === 'therapist');
                }
            });
            return () => unsubscribe();
        };
        checkRole();
    }, []);

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

    const handleSaveNotes = async () => {
        if (!editingSession || !patientId) return;
        setSavingNotes(true);
        try {
            await updateSessionNotes(editingSession, patientId, notesBuffer);
            alert('Notes updated successfully');
            setEditingSession(null);
            loadPatientData(); // Reload to show new notes
        } catch (err) {
            alert('Failed to save notes');
        } finally {
            setSavingNotes(false);
        }
    };

    const openEditNotes = (sessionId: string, currentNotes: string) => {
        setEditingSession(sessionId);
        setNotesBuffer(currentNotes || '');
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

    // Import inside the component or at top (dynamic import used here to avoid SSR issues if any, though likely safe at top)
    // But for cleaner code, we'll put imports at the top. 
    // Since I'm replacing a function block, I'll add the logic inside.

    const handleDownloadReport = async (session: any) => {
        try {
            const { jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;

            const doc = new jsPDF();

            // Brand Colors
            const primaryColor = [234, 88, 12]; // Orange-600
            const secondaryColor = [75, 85, 99]; // Gray-600

            // HEADER
            // Logo / Title
            doc.setFontSize(22);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text("ShiroPulse", 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            doc.text("Ayurvedic Therapy & Monitoring System", 14, 26);

            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setLineWidth(0.5);
            doc.line(14, 30, 196, 30);

            // REPORT TITLE
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text("Medical Therapy Session Report", 14, 45);

            // SESSION META
            doc.setFontSize(10);
            doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
            const dateStr = formatDate(session.metadata.start_ts);
            doc.text(`Session ID: ${session.id}`, 196, 20, { align: 'right' });
            doc.text(`Date: ${dateStr}`, 14, 52);
            doc.text(`Duration: ${formatDuration(session.summary?.duration || 0)}`, 14, 57);
            doc.text(`Therapist ID: ${session.metadata.therapist || 'N/A'}`, 14, 62);

            // PATIENT DETAILS SECTION
            doc.setFontSize(12);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text("Patient Information", 14, 75);

            const patientInfo = [
                ['Name', patient?.name || 'N/A', 'Age', `${patient?.age || 'N/A'}`],
                ['Gender', patient?.gender || 'N/A', 'ID Number', patient?.idNumber || 'N/A'],
                ['Conditions', patient?.medicalConditions || 'None', 'Consent', patient?.consent ? 'Signed' : 'Pending']
            ];

            autoTable(doc, {
                startY: 80,
                head: [],
                body: patientInfo,
                theme: 'plain',
                styles: { fontSize: 10, cellPadding: 2 },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 30 },
                    1: { cellWidth: 60 },
                    2: { fontStyle: 'bold', cellWidth: 30 },
                    3: { cellWidth: 60 }
                }
            });

            // VITALS SUMMARY
            let finalY = (doc as any).lastAutoTable.finalY + 15;
            doc.setFontSize(12);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text("Session Vitals Summary", 14, finalY);

            const vitalsData = [
                ['Average Pulse', `${session.summary?.avgPulse || '--'} BPM`],
                ['Average SpO2', `${session.summary?.avgSpO2 || '--'} %`],
                ['Max Temperature', `${session.summary?.maxTemp || '--'} °C`],
                ['Relaxation Index', `${session.summary?.relaxationIndex?.toFixed(1) || '--'} / 100`]
            ];

            autoTable(doc, {
                startY: finalY + 5,
                head: [['Metric', 'Value']],
                body: vitalsData,
                theme: 'striped',
                headStyles: { fillColor: primaryColor },
                styles: { fontSize: 10, cellPadding: 3 }
            });

            // RELAXATION ANALYSIS (NEW SECTION)
            if (session.summary?.relaxationState) {
                finalY = (doc as any).lastAutoTable.finalY + 15;
                doc.setFontSize(12);
                doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                doc.text("Ayurvedic Relaxation Analysis", 14, finalY);

                const rs = session.summary.relaxationState;
                const stateColor = rs.state.includes('Deeply') ? [22, 163, 74] : rs.state.includes('Moderately') ? [202, 138, 4] : [220, 38, 38];

                doc.setFontSize(14);
                doc.setTextColor(stateColor[0], stateColor[1], stateColor[2]);
                doc.text(rs.state, 14, finalY + 8);

                doc.setFontSize(10);
                doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
                doc.text(`"${rs.reason}"`, 14, finalY + 14);

                // Tech details
                if (rs.metrics) {
                    doc.setFontSize(9);
                    doc.setTextColor(100, 100, 100);
                    const details = `Pulse Drop: ${rs.metrics.pulseDrop?.toFixed(1) || 0} bpm | Pulse Stability: ${rs.metrics.pulseStability?.toFixed(2) || 0} | Confidence: ${(rs.confidence * 100).toFixed(0)}%`;
                    doc.text(details, 14, finalY + 20);
                }
            } else {
                // If old session without this data
                finalY = (doc as any).lastAutoTable.finalY;
            }

            // CLINICAL NOTES
            finalY = finalY + 30; // Add some buffer
            doc.setFontSize(12);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text("Clinical Notes & Observations", 14, finalY);

            const notes = session.summary?.notes || "No clinical notes recorded for this session.";

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            const splitNotes = doc.splitTextToSize(notes, 180);
            doc.text(splitNotes, 14, finalY + 7);

            // FOOTER
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 285);
                doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
            }

            // Save
            doc.save(`ShiroPulse_Report_${patient?.name?.replace(/\s+/g, '_')}_${session.id}.pdf`);

        } catch (err) {
            console.error("PDF generation failed:", err);
            alert("Failed to generate PDF report. Please contact support.");
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
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Patient History</h1>
                        <p className="text-gray-600 mt-1">{patient?.name || 'Loading...'}</p>
                    </div>
                    <Button onClick={() => navigate(isTherapist ? `/dashboard?patientId=${patientId}` : '/patient-dashboard')} variant="outline">
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
                                                    {/* Relaxation Badge */}
                                                    {session.summary?.relaxationState && (
                                                        <div className="group relative flex items-center">
                                                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-bold border ${session.summary.relaxationState.state === 'Deeply Relaxed' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                    session.summary.relaxationState.state === 'Moderately Relaxed' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                                        'bg-red-50 text-red-600 border-red-100'
                                                                }`}>
                                                                {session.summary.relaxationState.state === 'Deeply Relaxed' ? '🟢' :
                                                                    session.summary.relaxationState.state === 'Moderately Relaxed' ? '🟡' : '🔴'}
                                                                {' '} {session.summary.relaxationState.state}
                                                            </span>
                                                            {/* Tooltip */}
                                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                                                {session.summary.relaxationState.reason}
                                                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                                                            </div>
                                                        </div>
                                                    )}
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
                                        {selectedSession === session.id && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <h4 className="font-semibold mb-2">Session Details</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-gray-600">Therapist ID</p>
                                                        <p className="font-mono text-xs">{session.metadata.therapist}</p>
                                                    </div>
                                                    {session.summary?.alerts && session.summary.alerts.length > 0 && (
                                                        <div className="md:col-span-2">
                                                            <p className="text-gray-600 mb-1">Alerts</p>
                                                            <ul className="list-disc list-inside space-y-1">
                                                                {session.summary.alerts.map((alert, idx) => (
                                                                    <li key={idx} className="text-red-600">{alert}</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}

                                                    {/* Notes Section */}
                                                    <div className="md:col-span-2 bg-gray-50 p-3 rounded border border-gray-200">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <p className="text-gray-600 font-medium">Clinical Notes</p>
                                                            {isTherapist && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 text-xs text-blue-600"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openEditNotes(session.id, session.summary?.notes || '');
                                                                    }}
                                                                >
                                                                    Edit Notes
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-800 whitespace-pre-wrap">
                                                            {session.summary?.notes || 'No notes added.'}
                                                        </p>
                                                    </div>

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

            <Dialog open={!!editingSession} onOpenChange={() => setEditingSession(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Session Notes</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <Textarea
                            value={notesBuffer}
                            onChange={(e) => setNotesBuffer(e.target.value)}
                            rows={6}
                            placeholder="Enter clinical observations, patient feedback, or treatment adjustments..."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingSession(null)}>Cancel</Button>
                        <Button onClick={handleSaveNotes} disabled={savingNotes}>
                            {savingNotes ? 'Saving...' : 'Save Notes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
