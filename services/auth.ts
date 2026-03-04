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
    role?: 'CLIENT' | 'OPERATIONAL';
    isBlocked?: boolean;
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
        const roleToCreate = userData.role || 'CLIENT';
        const isBlocked = userData.isBlocked ?? false;

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
                    role: roleToCreate,
                    monthly_due_date: roleToCreate === 'OPERATIONAL' ? 1 : userData.monthlyDueDate,
                    monthly_value: roleToCreate === 'OPERATIONAL' ? 0 : userData.monthlyValue,
                    is_blocked: isBlocked,
                    jet_ski_manufacturer: roleToCreate === 'OPERATIONAL' ? 'N/A' : userData.jetSkiManufacturer,
                    jet_ski_model: roleToCreate === 'OPERATIONAL' ? 'N/A' : userData.jetSkiModel,
                    jet_ski_year: roleToCreate === 'OPERATIONAL' ? '2024' : userData.jetSkiYear,
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
export async function login(
    email: string,
    password: string,
    role: 'CLIENT' | 'MARINA' | 'OPERATIONAL',
    options?: { onClientRetry?: (nextAttempt: number, maxAttempts: number) => void }
): Promise<{ user: User | null; error: string | null }> {
    try {
        const normalizedEmail = email.trim().toLowerCase();

        // Special case for MARINA admin
        if (role === 'MARINA') {
            const adminAliases = ['admin@marina.com', 'admin@garagejets.com'];
            const isAdminAlias = adminAliases.includes(normalizedEmail);
            const bootstrapPasswordAccepted = isAdminAlias && (password === '2406' || password === '1234');
            const buildFallbackAdminUser = (): User => ({
                id: 'admin-local',
                email: 'admin@marina.com',
                name: 'Admin Marina',
                phone: '0000000000',
                cpf: '',
                address: 'Marina',
                cep: '00000000',
                registrationCode: '000',
                role: 'MARINA',
                monthlyDueDate: 1,
                monthlyValue: 0,
                isBlocked: false,
                jetSkiManufacturer: 'N/A',
                jetSkiModel: 'N/A',
                jetSkiYear: '2024',
                jetName: '',
                ownerType: 'UNICO',
            });

            // Fast path: allow admin aliases immediately with local/bootstrap password
            if (isAdminAlias) {
                const localAdminPassword = adminAliases
                    .map((alias) => localStorage.getItem(`pwd_${alias}`))
                    .find((stored) => !!stored);

                const localPasswordAccepted = !!localAdminPassword && localAdminPassword === password;

                if (localPasswordAccepted || bootstrapPasswordAccepted) {
                    adminAliases.forEach((alias) => localStorage.setItem(`pwd_${alias}`, password));
                    return { user: buildFallbackAdminUser(), error: null };
                }
            }

            let marinaData: any = null;

            const { data: directData } = await supabase
                .from('users')
                .select('*')
                .eq('email', normalizedEmail)
                .eq('role', 'MARINA')
                .maybeSingle();

            marinaData = directData;

            if (!marinaData && isAdminAlias) {
                const alternateEmail = adminAliases.find((alias) => alias !== normalizedEmail);

                if (alternateEmail) {
                    const { data: alternateData } = await supabase
                        .from('users')
                        .select('*')
                        .eq('email', alternateEmail)
                        .eq('role', 'MARINA')
                        .maybeSingle();

                    marinaData = alternateData;
                }
            }

            if (!marinaData) {
                // Create default admin if doesn't exist
                const canCreateAdmin =
                    isAdminAlias && (password === '2406' || password === '1234');

                if (canCreateAdmin) {
                    // If email already exists in another role, promote it to MARINA.
                    const { data: existingByEmail } = await supabase
                        .from('users')
                        .select('*')
                        .eq('email', normalizedEmail)
                        .maybeSingle();

                    if (existingByEmail) {
                        const { data: promotedUser, error: promoteError } = await supabase
                            .from('users')
                            .update({
                                role: 'MARINA',
                                name: existingByEmail.name || 'Admin Marina',
                                monthly_due_date: existingByEmail.monthly_due_date ?? 1,
                                monthly_value: existingByEmail.monthly_value ?? 0,
                                is_blocked: false,
                                jet_ski_manufacturer: existingByEmail.jet_ski_manufacturer || 'N/A',
                                jet_ski_model: existingByEmail.jet_ski_model || 'N/A',
                                jet_ski_year: existingByEmail.jet_ski_year || '2024',
                            })
                            .eq('id', existingByEmail.id)
                            .select()
                            .single();

                        if (promoteError) {
                            console.error('Erro ao promover admin. Usando fallback local.', promoteError);
                            adminAliases.forEach((alias) => localStorage.setItem(`pwd_${alias}`, password));
                            return { user: buildFallbackAdminUser(), error: null };
                        }

                        marinaData = promotedUser;
                    } else {
                        const registrationCode = await getNextRegistrationCode();

                        const { data: newAdmin, error: createError } = await supabase
                            .from('users')
                            .insert([
                                {
                                    email: normalizedEmail,
                                    name: 'Admin Marina',
                                    phone: '0000000000',
                                    cpf: null,
                                    address: 'Marina',
                                    cep: '00000000',
                                    registration_code: registrationCode,
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
                            console.error('Erro ao criar admin. Usando fallback local.', createError);
                            adminAliases.forEach((alias) => localStorage.setItem(`pwd_${alias}`, password));
                            return { user: buildFallbackAdminUser(), error: null };
                        }

                        marinaData = newAdmin;
                    }
                } else {
                    return { user: null, error: 'Admin não encontrado' };
                }
            }

            const canonicalEmail = String(marinaData.email || normalizedEmail).toLowerCase();
            const storedPasswordByLoginEmail = localStorage.getItem(`pwd_${normalizedEmail}`);
            const storedPasswordByCanonicalEmail = localStorage.getItem(`pwd_${canonicalEmail}`);
            const storedPassword = storedPasswordByLoginEmail || storedPasswordByCanonicalEmail;

            if (storedPassword) {
                if (storedPassword !== password) {
                    if (bootstrapPasswordAccepted) {
                        adminAliases.forEach((alias) => localStorage.setItem(`pwd_${alias}`, password));
                    } else {
                        return { user: null, error: 'Senha incorreta' };
                    }
                }
            } else {
                localStorage.setItem(`pwd_${canonicalEmail}`, password);
                if (isAdminAlias) {
                    adminAliases.forEach((alias) => localStorage.setItem(`pwd_${alias}`, password));
                }
            }

            if (isAdminAlias) {
                adminAliases.forEach((alias) => localStorage.setItem(`pwd_${alias}`, password));
            }

            const user: User = {
                id: marinaData.id,
                email: marinaData.email,
                name: marinaData.name,
                phone: marinaData.phone,
                cpf: marinaData.cpf,
                address: marinaData.address,
                cep: marinaData.cep,
                registrationCode: marinaData.registration_code,
                role: marinaData.role,
                monthlyDueDate: marinaData.monthly_due_date,
                monthlyValue: marinaData.monthly_value,
                isBlocked: marinaData.is_blocked,
                jetSkiManufacturer: marinaData.jet_ski_manufacturer,
                jetSkiModel: marinaData.jet_ski_model,
                jetSkiYear: marinaData.jet_ski_year,
                jetName: marinaData.jet_name || '',
                ownerType: marinaData.owner_type || 'UNICO',
            };

            return { user, error: null };
        }

        if (role === 'OPERATIONAL') {
            const { data: operationalData } = await supabase
                .from('users')
                .select('*')
                .eq('email', normalizedEmail)
                .eq('role', 'OPERATIONAL')
                .maybeSingle();

            if (operationalData) {
                if (operationalData.is_blocked) {
                    return { user: null, error: 'Usuário operacional bloqueado' };
                }

                const storedPassword = localStorage.getItem(`pwd_${normalizedEmail}`);
                if (storedPassword) {
                    if (storedPassword !== password) {
                        return { user: null, error: 'Senha incorreta' };
                    }
                } else {
                    localStorage.setItem(`pwd_${normalizedEmail}`, password);
                }

                const user: User = {
                    id: operationalData.id,
                    email: operationalData.email,
                    name: operationalData.name,
                    phone: operationalData.phone,
                    cpf: operationalData.cpf,
                    address: operationalData.address,
                    cep: operationalData.cep,
                    registrationCode: operationalData.registration_code,
                    role: operationalData.role,
                    monthlyDueDate: operationalData.monthly_due_date,
                    monthlyValue: operationalData.monthly_value,
                    isBlocked: operationalData.is_blocked,
                    jetSkiManufacturer: operationalData.jet_ski_manufacturer,
                    jetSkiModel: operationalData.jet_ski_model,
                    jetSkiYear: operationalData.jet_ski_year,
                    jetName: operationalData.jet_name || '',
                    ownerType: operationalData.owner_type || 'UNICO',
                };

                return { user, error: null };
            }

            const operationalEmail = 'operacional@marina.com';
            const operationalPassword = '9876';
            const storedLegacyPassword = localStorage.getItem(`pwd_${operationalEmail}`);
            const validLegacyPassword = storedLegacyPassword || operationalPassword;

            if (normalizedEmail !== operationalEmail || password !== validLegacyPassword) {
                return { user: null, error: 'Credenciais operacionais inválidas' };
            }

            if (!storedLegacyPassword) {
                localStorage.setItem(`pwd_${operationalEmail}`, operationalPassword);
            }

            const legacyOperationalUser: User = {
                id: 'operational-local',
                email: operationalEmail,
                name: 'Operacional Marina',
                phone: '0000000000',
                cpf: '00000000000',
                address: 'Marina',
                cep: '00000000',
                registrationCode: '001',
                role: 'OPERATIONAL',
                monthlyDueDate: 1,
                monthlyValue: 0,
                isBlocked: false,
                jetSkiManufacturer: 'N/A',
                jetSkiModel: 'N/A',
                jetSkiYear: '2024',
                jetName: '',
                ownerType: 'UNICO',
            };

            return { user: legacyOperationalUser, error: null };
        }

        // Regular client login
        const clientLoginTimeoutMs = 10000;
        const retryDelayMs = 350;
        const maxAttempts = 2;
        const isRetryableLoginError = (err: any) => {
            const message = String(err?.message || '').toUpperCase();
            return (
                message.includes('CLIENT_LOGIN_TIMEOUT') ||
                message.includes('FAILED TO FETCH') ||
                message.includes('NETWORK')
            );
        };

        const runClientQueryWithTimeout = async () => {
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('CLIENT_LOGIN_TIMEOUT')), clientLoginTimeoutMs);
            });

            const userQueryPromise = supabase
                .from('users')
                .select('*')
                .eq('email', normalizedEmail)
                .eq('role', 'CLIENT')
                .single();

            return Promise.race([userQueryPromise, timeoutPromise]) as Promise<Awaited<typeof userQueryPromise>>;
        };

        let data: any = null;
        let error: any = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await runClientQueryWithTimeout();
                data = result.data;
                error = result.error;
                break;
            } catch (queryErr: any) {
                if (attempt < maxAttempts && isRetryableLoginError(queryErr)) {
                    options?.onClientRetry?.(attempt + 1, maxAttempts);
                    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
                    continue;
                }
                throw queryErr;
            }
        }

        if (error || !data) {
            return { user: null, error: 'Usuário não encontrado' };
        }

        if (data.is_blocked) {
            return { user: null, error: 'Usuário bloqueado. Favor entrar em contato com o administrador.' };
        }

        // Verify password (stored in localStorage for simplicity)
        const storedPassword = localStorage.getItem(`pwd_${normalizedEmail}`);
        // Se houver senha armazenada, validar contra ela
        // Se não houver, significa que é novo ou foi resetada - aceitar a senha digitada e salvar
        if (storedPassword) {
            if (storedPassword !== password) {
                return { user: null, error: 'Senha incorreta' };
            }
        } else {
            // Primeira tentativa após reset ou novo login - salvar a senha na localStorage
            localStorage.setItem(`pwd_${normalizedEmail}`, password);
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
        if (err?.message === 'CLIENT_LOGIN_TIMEOUT') {
            return { user: null, error: 'Conexão lenta. Tente novamente em alguns segundos.' };
        }
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
    try {
        return JSON.parse(userStr);
    } catch (err) {
        console.error('Falha ao ler currentUser do localStorage:', err);
        localStorage.removeItem('currentUser');
        return null;
    }
}

// Save current user to localStorage
export function saveCurrentUser(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
}
