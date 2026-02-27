
export enum JetStatus {
  IN_DOCK = 'IN_DOCK',
  IN_WATER = 'IN_WATER',
  NAVIGATING = 'NAVIGATING',
  RETURNED = 'RETURNED',
  CHECKED_IN = 'CHECKED_IN'
}

export const StatusLabels: Record<JetStatus, string> = {
  [JetStatus.IN_DOCK]: 'Jet-ski na vaga',
  [JetStatus.IN_WATER]: 'Jet-ski na água',
  [JetStatus.NAVIGATING]: 'Jet-ski navegando',
  [JetStatus.RETURNED]: 'Jet-ski retornou',
  [JetStatus.CHECKED_IN]: 'Check-in e fotos do jet'
};

export interface JetGroup {
  id: string;
  jetName: string;
  manufacturer: string;
  model: string;
  year: string;
  maxCotistas: number;
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Capturing client's password
  address: string;
  cep: string;
  phone: string;
  registrationCode: string;
  monthlyDueDate: number;
  monthlyValue: number;
  isBlocked: boolean;
  role: 'CLIENT' | 'MARINA' | 'OPERATIONAL';
  // New Jet-Ski details
  jetSkiManufacturer: string;
  jetSkiModel: string;
  jetSkiYear: string;
  jetName?: string; // Name/identifier of the jet ski (required for COTISTA, optional for UNICO)
  jetGroupId?: string; // Group ID for COTISTA owners
  ownerType: 'UNICO' | 'COTISTA'; // Owner type: Único (single owner) or Cotista (co-owner)
  cpf?: string; // Optional CPF field
}

export interface Reservation {
  id: string;
  userId: string;
  userName: string;
  jetName: string; // Jet name from user's profile
  date: string;
  time: string;
  route: string;
  status: JetStatus;
  photos: string[];
  clientPhotos?: string[]; // Fotos tiradas pelo cliente durante o passeio
  // Timestamps para histórico
  createdAt?: string; // Quando a reserva foi criada
  inWaterAt?: string; // Quando indo para água
  navigatingAt?: string; // Quando começou a navegar
  returnedAt?: string; // Quando retornou
  checkedInAt?: string; // Quando fez check-in com fotos
}

export interface MaintenanceBlock {
  id: string;
  jetName: string;
  date: string;
  createdAt: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  reservations: Reservation[];
  lastClientNumber: number;
}
