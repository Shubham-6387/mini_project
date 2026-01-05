import { useState } from 'react';
import { login, getUserProfile, signOutUser } from '../lib/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';

export default function PatientLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const cred = await login({ email, password });
            const profile = await getUserProfile(cred.user.uid);

            if (profile?.role === 'patient') {
                navigate('/patient-dashboard');
            } else {
                // Determine user role for the error message
                const role = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Unknown';
                await signOutUser();
                setError(`Access denied. This portal is for Patients only. You are logged in as a ${role}.`);
            }
        } catch (err: any) {
            let errorMessage = 'An error occurred. Please try again.';

            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                errorMessage = 'Invalid email or password.';
            } else if (err.code === 'auth/invalid-email') {
                errorMessage = 'Please enter a valid email address.';
            } else if (err.code === 'auth/user-disabled') {
                errorMessage = 'This account has been disabled.';
            } else if (err.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed login attempts. Try again later.';
            } else if (err.message) {
                errorMessage = err.message.replace('Firebase: ', '').replace(/\(auth\/[^)]+\)\.?/, '').trim();
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-teal-50 to-emerald-50 p-4">
            <Card className="w-full max-w-md shadow-xl bg-white/80 backdrop-blur-sm border-teal-100">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center text-teal-800">Patient Portal</CardTitle>
                    <CardDescription className="text-center text-teal-600">
                        Enter your credentials to access your health dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="patient@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="focus:border-teal-500 focus:ring-teal-200"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="focus:border-teal-500 focus:ring-teal-200"
                            />
                        </div>
                        {error && (
                            <div className="text-sm text-red-500 font-medium p-3 bg-red-50 rounded border border-red-100">
                                {error}
                            </div>
                        )}
                        <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
                            {loading ? "Accessing Portal..." : "Secure Login"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                        Are you a Therapist?{' '}
                        <Link to="/login" className="text-teal-600 hover:underline font-medium">
                            Login here
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
