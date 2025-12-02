import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPatient, searchPatientById, onAuthState } from '../lib/firebase';
import { type User } from 'firebase/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Navigation } from '../components/Navigation';
import { Footer } from '../components/Footer';

export default function BookSession() {
    const [user, setUser] = useState<User | null>(null);
    const [activeTab, setActiveTab] = useState<'search' | 'register'>('search');
    const [searchId, setSearchId] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: '',
        healthNotes: '',
        medicalConditions: '',
        idNumber: '',
        consent: false
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthState((currentUser) => {
            if (!currentUser) {
                navigate('/login');
            } else {
                setUser(currentUser);
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    const handleSearchPatient = async () => {
        if (!searchId.trim()) {
            setError('Please enter a patient ID to search');
            return;
        }

        setSearching(true);
        setError('');

        try {
            const patient = await searchPatientById(searchId);

            if (patient) {
                alert(`Patient found: ${patient.name}\nPlease select this patient from the dashboard to start a session.`);
                navigate('/dashboard');
            } else {
                setError('Patient not found. Please use the "Register New Patient" tab to add them.');
            }
        } catch (err: any) {
            setError('Error searching for patient: ' + err.message);
        } finally {
            setSearching(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGenderChange = (value: string) => {
        setFormData({ ...formData, gender: value });
    };

    const handleConsentChange = (checked: boolean) => {
        setFormData({ ...formData, consent: checked });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.age || !formData.gender || !formData.healthNotes ||
            !formData.medicalConditions || !formData.idNumber || !formData.consent) {
            setError('Please fill in all required fields');
            return;
        }

        if (!user) {
            setError('You must be logged in to add a patient');
            return;
        }

        setLoading(true);
        try {
            await createPatient({
                name: formData.name,
                age: parseInt(formData.age),
                gender: formData.gender,
                healthNotes: formData.healthNotes,
                medicalConditions: formData.medicalConditions,
                idNumber: formData.idNumber,
                consent: formData.consent
            }, user.uid);

            alert('Patient registered successfully!');
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col">
            <Navigation />

            <main className="flex-grow container mx-auto px-6 py-24">
                <div className="max-w-2xl mx-auto">
                    <Card className="shadow-xl bg-white/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold text-center text-orange-600">Patient Management</CardTitle>
                            <CardDescription className="text-center">
                                Search for an existing patient or register a new one
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Tab Buttons */}
                            <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
                                <button
                                    onClick={() => {
                                        setActiveTab('search');
                                        setError('');
                                    }}
                                    className={`flex-1 py-3 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'search'
                                            ? 'bg-white text-orange-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Search Patient
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab('register');
                                        setError('');
                                        setSearchId('');
                                    }}
                                    className={`flex-1 py-3 px-4 rounded-md font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'register'
                                            ? 'bg-white text-orange-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Register New
                                </button>
                            </div>

                            {/* Search Patient Tab */}
                            {activeTab === 'search' && (
                                <div className="space-y-4">
                                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                                        <Label htmlFor="searchId" className="text-lg font-semibold mb-3 block text-blue-900">
                                            Search by Patient ID
                                        </Label>
                                        <p className="text-sm text-blue-700 mb-4">
                                            Enter the unique patient ID to search in the database
                                        </p>
                                        <div className="flex gap-2">
                                            <Input
                                                id="searchId"
                                                placeholder="e.g., patient_1234567890"
                                                value={searchId}
                                                onChange={(e) => setSearchId(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSearchPatient()}
                                                className="flex-1 border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white shadow-sm"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleSearchPatient}
                                                disabled={searching}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                                            >
                                                {searching ? "Searching..." : "Search"}
                                            </Button>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg text-yellow-800 text-sm font-medium">
                                            ⚠️ {error}
                                        </div>
                                    )}

                                    <div className="pt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => navigate('/dashboard')}
                                            className="w-full"
                                        >
                                            ← Back to Dashboard
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Register New Patient Tab */}
                            {activeTab === 'register' && (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="Patient's full name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className="border-2 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="age">Age <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="age"
                                            name="age"
                                            type="number"
                                            placeholder="Patient's age"
                                            value={formData.age}
                                            onChange={handleChange}
                                            required
                                            min="0"
                                            max="150"
                                            className="border-2 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                                        <Select onValueChange={handleGenderChange} value={formData.gender} required>
                                            <SelectTrigger className="border-2 focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                                                <SelectValue placeholder="Select gender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">Male</SelectItem>
                                                <SelectItem value="female">Female</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="healthNotes">Health Notes / History <span className="text-red-500">*</span></Label>
                                        <textarea
                                            id="healthNotes"
                                            name="healthNotes"
                                            placeholder="Any relevant health information or history"
                                            value={formData.healthNotes}
                                            onChange={handleChange}
                                            required
                                            className="flex min-h-[120px] w-full rounded-md border-2 border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="medicalConditions">Medical Conditions <span className="text-red-500">*</span></Label>
                                        <textarea
                                            id="medicalConditions"
                                            name="medicalConditions"
                                            placeholder="Any existing medical conditions"
                                            value={formData.medicalConditions}
                                            onChange={handleChange}
                                            required
                                            className="flex min-h-[80px] w-full rounded-md border-2 border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="idNumber">ID Number <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="idNumber"
                                            name="idNumber"
                                            placeholder="Patient's ID number"
                                            value={formData.idNumber}
                                            onChange={handleChange}
                                            required
                                            className="border-2 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2 pt-4">
                                        <Checkbox
                                            id="consent"
                                            checked={formData.consent}
                                            onCheckedChange={handleConsentChange}
                                            required
                                        />
                                        <Label
                                            htmlFor="consent"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            I consent to the collection and processing of this health information <span className="text-red-500">*</span>
                                        </Label>
                                    </div>

                                    {error && (
                                        <div className="text-sm font-medium p-3 rounded-md bg-red-50 text-red-500 border-2 border-red-200">
                                            ❌ {error}
                                        </div>
                                    )}

                                    <div className="flex gap-4 pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => navigate('/dashboard')}
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                                            disabled={loading}
                                        >
                                            {loading ? "Registering..." : "Register Patient"}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    );
}
