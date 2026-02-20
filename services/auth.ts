import { supabase } from '../supabaseClient';
import { User } from '../types';

export interface RegisterData {
    email: string;
    password: string;
    name: string;
    phone: string;
    cpf: string;
    address: string;
    cep: string;
    monthlyDueDate: number;
    monthlyValue: number;
    jetSkiManufacturer: string;
    jetSkiModel: string;
    jetSkiYear: string;
}

// Get next registration code
async function getNextRegistrationCode(): Promise<string> {
    const { data, error } = await supabase
        .from('users')
        .select('registration_code')
        .order('registration_code', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error getting last registration code:', error);
        return '001';
    }

    if (!data || data.length === 0) {
        return '001';
    }

    const lastCode = parseInt(data[0].registration_code);
    const nextCode = lastCode + 1;
    return String(nextCode).padStart(3, '0');
}

// Register new user
export async function register(userData: RegisterData): Promise<{ user: User | null; error: string | null }> {
    try {
        const normalizedCpf = userData.cpf?.trim();
        const cpfValue = normalizedCpf ? normalizedCpf : null;

        // Get next registration code
        const registrationCode = await getNextRegistrationCode();

        // Prevent duplicate emails
        const { data: existingUser, error: existingError } = await supabase
            .from('users')
            .select('id')
            .eq('email', userData.email)
            .maybeSingle();

        if (existingError) {
            console.error('Error checking existing user:', existingError);
            return { user: null, error: 'Erro ao verificar usuário existente' };
        }

        if (existingUser) {
            return { user: null, error: 'Email já cadastrado' };
        }

        // Prevent duplicate CPF
        if (cpfValue) {
            const { data: existingCpf, error: cpfError } = await supabase
                .from('users')
                .select('id')
            .eq('cpf', cpfValue)
                .maybeSingle();

            if (cpfError) {
                console.error('Error checking existing CPF:', cpfError);
                return { user: null, error: 'Erro ao verificar CPF' };
            }

            if (existingCpf) {
                return { user: null, error: 'CPF já cadastrado' };
            }
        }

        // Create user in users table (not using Supabase Auth for simplicity)
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    email: userData.email,
                    name: userData.name,
                    phone: userData.phone,
                    cpf: cpfValue,
                    address: userData.address,
                    cep: userData.cep,
                    registration_code: registrationCode,
                    role: 'CLIENT',
                    monthly_due_date: userData.monthlyDueDate,
                    monthly_value: userData.monthlyValue,
                    is_blocked: false,
                    jet_ski_manufacturer: userData.jetSkiManufacturer,
                    jet_ski_model: userData.jetSkiModel,
                    jet_ski_year: userData.jetSkiYear,
                    // note: `jet_name` and `owner_type` columns may not exist on some DBs;
                    // avoid sending them to prevent 400 errors. If your DB has these
                    // columns, add them via SQL or uncomment the lines below.
                    // jet_name: '',
                    // owner_type: 'UNICO',
                },
            ])
            .select()
            .single();

        if (error) {
                console.error('Error registering user:', {
                    status: (error as any).status,
                    code: (error as any).code,
                    message: (error as any).message,
                    details: (error as any).details,
                    hint: (error as any).hint,
                });
                console.error('Raw supabase error object:', error);
                return { user: null, error: (error as any).message || 'Erro desconhecido' };
        }

        // Store password separately (in a real app, use Supabase Auth)
        localStorage.setItem(`pwd_${userData.email}`, userData.password);

        const user: User = {
            id: data.id,
            email: data.email,
            name: data.name,
            phone: data.phone,
            cpf: data.cpf,
            address: data.address,
            cep: data.cep,
            registrationCode: data.registration_code,
            role: data.role,
            monthlyDueDate: data.monthly_due_date,
            monthlyValue: data.monthly_value,
            isBlocked: data.is_blocked,
            jetSkiManufacturer: data.jet_ski_manufacturer,
            jetSkiModel: data.jet_ski_model,
            jetSkiYear: data.jet_ski_year,
            jetName: data.jet_name || '',
            ownerType: data.owner_type || 'UNICO',
        };

        return { user, error: null };
    } catch (err: any) {
        console.error('Unexpected error during registration:', err);
        return { user: null, error: err.message };
    }
}

// Login user
export async function login(email: string, password: string, role: 'CLIENT' | 'MARINA' | 'OPERATIONAL'): Promise<{ user: User | null; error: string | null }> {
    try {
        // Special case for MARINA admin
        if (role === 'MARINA') {
            // Check if admin user exists
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .eq('role', 'MARINA')
                .single();

            if (error || !data) {
                // Create default admin if doesn't exist
                if (email === 'admin@garagejets.com' && password === 'admin123') {
                    const { data: newAdmin, error: createError } = await supabase
                        .from('users')
                        .insert([
                            {
                                email: 'admin@garagejets.com',
                                name: 'Admin Marina',
                                phone: '0000000000',
                                cpf: '00000000000',
                                address: 'Marina',
                                cep: '00000000',
                                registration_code: '000',
                                role: 'MARINA',
                                monthly_due_date: 1,
                                monthly_value: 0,
                                is_blocked: false,
                                jet_ski_manufacturer: 'N/A',
                                jet_ski_model: 'N/A',
                                        jet_ski_year: '2024',
                                        // avoid jet_name/owner_type for compatibility
                                    },
                        ])
                        .select()
                        .single();

                    if (createError) {
                        return { user: null, error: 'Erro ao criar admin' };
                    }

                    localStorage.setItem('pwd_admin@garagejets.com', 'admin123');

                    const user: User = {
                        id: newAdmin.id,
                        email: newAdmin.email,
                        name: newAdmin.name,
                        phone: newAdmin.phone,
                        cpf: newAdmin.cpf,
                        address: newAdmin.address,
                        cep: newAdmin.cep,
                        registrationCode: newAdmin.registration_code,
                        role: newAdmin.role,
                        monthlyDueDate: newAdmin.monthly_due_date,
                        monthlyValue: newAdmin.monthly_value,
                        isBlocked: newAdmin.is_blocked,
                        jetSkiManufacturer: newAdmin.jet_ski_manufacturer,
                        jetSkiModel: newAdmin.jet_ski_model,
                        jetSkiYear: newAdmin.jet_ski_year,
                        jetName: newAdmin.jet_name || '',
                        ownerType: newAdmin.owner_type || 'UNICO',
                    };

                    return { user, error: null };
                }
                return { user: null, error: 'Admin não encontrado' };
            }

            // Special handling for admin@marina.com - set password on first login
            if (email === 'admin@marina.com' && password === '1234') {
                const storedPassword = localStorage.getItem(`pwd_${email}`);
                if (!storedPassword) {
                    // First time login - store the password
                    localStorage.setItem(`pwd_${email}`, password);
                }
            }

            // Verify password
            const storedPassword = localStorage.getItem(`pwd_${email}`);
            if (storedPassword !== password) {
                return { user: null, error: 'Senha incorreta' };
            }


            const user: User = {
                id: data.id,
                email: data.email,
                name: data.name,
                phone: data.phone,
                cpf: data.cpf,
                address: data.address,
                cep: data.cep,
                registrationCode: data.registration_code,
                role: data.role,
                monthlyDueDate: data.monthly_due_date,
                monthlyValue: data.monthly_value,
                isBlocked: data.is_blocked,
                jetSkiManufacturer: data.jet_ski_manufacturer,
                jetSkiModel: data.jet_ski_model,
                jetSkiYear: data.jet_ski_year,
                jetName: data.jet_name || '',
                ownerType: data.owner_type || 'UNICO',
            };

            return { user, error: null };
        }

        if (role === 'OPERATIONAL') {
            const operationalEmail = 'operacional@marina.com';
            const operationalPassword = '9876';

            if (email !== operationalEmail || password !== operationalPassword) {
                return { user: null, error: 'Credenciais operacionais inválidas' };
            }

            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', operationalEmail)
                .eq('role', 'OPERATIONAL')
                .single();

            if (error || !data) {
                const { data: newOperational, error: createError } = await supabase
                    .from('users')
                    .insert([
                        {
                            email: operationalEmail,
                            name: 'Operacional Marina',
                            phone: '0000000000',
                            cpf: '00000000000',
                            address: 'Marina',
                            cep: '00000000',
                            registration_code: '001',
                            role: 'OPERATIONAL',
                            monthly_due_date: 1,
                            monthly_value: 0,
                            is_blocked: false,
                            jet_ski_manufacturer: 'N/A',
                            jet_ski_model: 'N/A',
                            jet_ski_year: '2024',
                        },
                    ])
                    .select()
                    .single();

                if (createError) {
                    return { user: null, error: 'Erro ao criar usuário operacional' };
                }

                localStorage.setItem(`pwd_${operationalEmail}`, operationalPassword);

                const user: User = {
                    id: newOperational.id,
                    email: newOperational.email,
                    name: newOperational.name,
                    phone: newOperational.phone,
                    cpf: newOperational.cpf,
                    address: newOperational.address,
                    cep: newOperational.cep,
                    registrationCode: newOperational.registration_code,
                    role: newOperational.role,
                    monthlyDueDate: newOperational.monthly_due_date,
                    monthlyValue: newOperational.monthly_value,
                    isBlocked: newOperational.is_blocked,
                    jetSkiManufacturer: newOperational.jet_ski_manufacturer,
                    jetSkiModel: newOperational.jet_ski_model,
                    jetSkiYear: newOperational.jet_ski_year,
                    jetName: newOperational.jet_name || '',
                    ownerType: newOperational.owner_type || 'UNICO',
                };

                return { user, error: null };
            }

            const storedPassword = localStorage.getItem(`pwd_${operationalEmail}`);
            if (!storedPassword) {
                localStorage.setItem(`pwd_${operationalEmail}`, operationalPassword);
            }

            const user: User = {
                id: data.id,
                email: data.email,
                name: data.name,
                phone: data.phone,
                cpf: data.cpf,
                address: data.address,
                cep: data.cep,
                registrationCode: data.registration_code,
                role: data.role,
                monthlyDueDate: data.monthly_due_date,
                monthlyValue: data.monthly_value,
                isBlocked: data.is_blocked,
                jetSkiManufacturer: data.jet_ski_manufacturer,
                jetSkiModel: data.jet_ski_model,
                jetSkiYear: data.jet_ski_year,
                jetName: data.jet_name || '',
                ownerType: data.owner_type || 'UNICO',
            };

            return { user, error: null };
        }

        // Regular client login
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('role', 'CLIENT')
            .single();

        if (error || !data) {
            return { user: null, error: 'Usuário não encontrado' };
        }

        // Verify password (stored in localStorage for simplicity)
        const storedPassword = localStorage.getItem(`pwd_${email}`);
        if (storedPassword !== password) {
            return { user: null, error: 'Senha incorreta' };
        }

        const user: User = {
            id: data.id,
            email: data.email,
            name: data.name,
            phone: data.phone,
            cpf: data.cpf,
            address: data.address,
            cep: data.cep,
            registrationCode: data.registration_code,
            role: data.role,
            monthlyDueDate: data.monthly_due_date,
            monthlyValue: data.monthly_value,
            isBlocked: data.is_blocked,
            jetSkiManufacturer: data.jet_ski_manufacturer,
            jetSkiModel: data.jet_ski_model,
            jetSkiYear: data.jet_ski_year,
            jetName: data.jet_name || '',
            ownerType: data.owner_type || 'UNICO',
        };

        return { user, error: null };
    } catch (err: any) {
        console.error('Unexpected error during login:', err);
        return { user: null, error: err.message };
    }
}

// Logout user
export function logout(): void {
    // Clear any session data if needed
    localStorage.removeItem('currentUser');
}

// Get current user from localStorage
export function getCurrentUser(): User | null {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return null;
    return JSON.parse(userStr);
}

// Save current user to localStorage
export function saveCurrentUser(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
}
