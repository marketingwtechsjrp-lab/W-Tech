
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER'
}

export interface Permission {
  viewFinance: boolean;
  manageTeam: boolean;
  manageContent: boolean;
  manageOrders: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: any;
  level: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role | string; // Supporting both object (after fetch) and string (legacy/simple)
  avatar: string;
  permissions: Permission; // Legacy
  status: 'Active' | 'Inactive';
  password?: string;
  role_id?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  date: string;
  dateEnd?: string; // Mapped from date_end
  location: string;
  locationType: 'Online' | 'Presencial'; // Mapped from location_type
  // Location Fields
  zipCode?: string; // Mapped from zip_code
  address?: string; // Mapped from address
  addressNumber?: string; // Mapped from address_number
  addressNeighborhood?: string; // Mapped from address_neighborhood
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  price: number;
  capacity: number;
  registeredCount: number; // Mapped from registered_count
  image: string;
  tags: string[];
  features: string[];
  status: 'Published' | 'Draft';
  hotelsInfo?: string; // Mapped from hotels_info
  // New Fields
  startTime?: string; // Mapped from start_time
  endTime?: string; // Mapped from end_time
  mapUrl?: string; // Mapped from map_url
  schedule?: string; // Mapped from schedule
}

export interface Enrollment {
  id: string;
  courseId: string; // Mapped from course_id
  studentName: string; // Mapped from student_name
  studentEmail: string; // Mapped from student_email
  studentPhone: string; // Mapped from student_phone
  status: 'Confirmed' | 'Pending' | 'CheckedIn';
  amountPaid?: number; // Mapped from amount_paid
  paymentMethod?: string; // Mapped from payment_method
  createdAt: string; // Mapped from created_at
}

export interface PostComment {
  id: string;
  postId: string; // Mapped from post_id
  userName: string; // Mapped from user_name
  content: string;
  createdAt: string; // Mapped from created_at
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string; // HTML Content
  author: string;
  date: string;
  category: string;
  image: string;
  status: 'Published' | 'Draft';
  // New SEO Fields
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  // Analytics & Scoring
  views?: number;
  clicks?: number;
  seoScore?: number; // Mapped from seo_score
}

export interface LandingPage {
  id: string;
  courseId: string; // FKey to SITE_Courses
  slug: string; // URL slug
  title: string; // Hero Title
  subtitle: string; // Hero Subtitle
  heroImage: string; // Hero Background
  videoUrl?: string; // Optional Video
  benefits: { title: string; description: string; icon?: string }[];
  instructorName: string;
  instructorBio: string;
  instructorImage: string;
  testimonials?: { name: string; text: string; image?: string }[];
  whatsappNumber?: string; // For CTA
  pixelId?: string; // Facebook Pixel
  modules?: { title: string; description: string; image: string }[];
  heroSecondaryImage?: string;
}


export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'Course_Registration' | 'Contact_Form' | 'Newsletter' | 'Course_Purchase';
  status: 'New' | 'Contacted' | 'Negotiating' | 'Converted';
  contextId?: string; // Mapped from context_id
  createdAt: string; // Mapped from created_at
  assignedTo?: string; // Mapped from assigned_to
  internalNotes?: string; // Mapped from internal_notes
}

export interface Mechanic {
  id: string;
  name: string;
  workshopName: string; // Mapped from workshop_name
  city: string;
  state: string;
  phone: string;
  email?: string;
  photo: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  specialty: string[];
  joinedDate: string; // Mapped from joined_date
  latitude?: number;
  longitude?: number;
  description?: string;
  // Address fields
  street?: string;
  number?: string;
  zipCode?: string; // Mapped from zip_code
  district?: string;
  cpfCnpj?: string; // Mapped from cpf_cnpj
  group?: string; // Mapped from group
}

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  category: string;
}

// --- E-commerce & Finance Types ---

export interface CartItem {
  courseId: string;
  title: string;
  price: number;
  image: string;
}

export interface Order {
  id: string;
  customerName: string; // Mapped from customer_name
  customerEmail: string; // Mapped from customer_email
  date: string;
  status: 'Pending' | 'Paid' | 'Cancelled';
  total: number;
  items: CartItem[]; // Stored as JSONB
  paymentMethod: 'Credit_Card' | 'Pix' | 'Boleto'; // Mapped from payment_method
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'Income' | 'Expense';
  date: string;
  category: 'Sales' | 'Operational' | 'Marketing' | 'Payroll';
  status: 'Completed' | 'Pending';
  payment_method?: string; // Mapped from payment_method
  enrollment_id?: string; // Optional link to enrollment
}

export interface SystemConfig {
  [key: string]: string | number | boolean | any;
}