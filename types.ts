
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
  slug?: string;
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
  recyclingPrice?: number; // Mapped from recycling_price
  type?: 'Course' | 'Event'; // Mapped from type
  imageSourceType?: 'Url' | 'Upload';
  // Reminder Settings
  reminder5dEnabled?: boolean;
  reminder1dEnabled?: boolean;
  reminder5dDays?: number;
  reminder1dDays?: number;
  whatToBring?: string;
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
  // Address & Credentialing
  address?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isCredentialed?: boolean; // Mapped from is_credentialed
  totalAmount?: number; // Mapped from total_amount
  reminder5dSent?: boolean;
  reminder1dSent?: boolean;
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
  quizEnabled?: boolean; // Mapped from quiz_enabled
}


export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'Course_Registration' | 'Contact_Form' | 'Newsletter' | 'Course_Purchase';
  status: 'New' | 'Contacted' | 'Negotiating' | 'Converted' | 'Qualified' | 'Matriculated' | 'CheckedIn' | 'Cold' | 'Rejected' | 'Lost';
  contextId?: string; // Mapped from context_id
  createdAt: string; // Mapped from created_at
  assignedTo?: string; // Mapped from assigned_to
  internalNotes?: string; // Mapped from internal_notes
  tags?: string[];
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
  course_id?: string; // Optional link to course
  event_id?: string; // Optional link to event
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  created_at: string;
}

export interface SystemConfig {
  [key: string]: string | number | boolean | any;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'Newsletter' | 'Course_Announcement' | 'Post_Notification' | 'Custom';
  targetAudience: 'All' | 'Students' | 'Leads' | 'Subscribers';
  status: 'Draft' | 'Scheduled' | 'Sending' | 'Sent' | 'Failed';
  scheduledAt?: string;
  sentAt?: string;
  statsSent: number;
  statsOpened: number;
  statsClicked: number;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  campaignId: string;
  recipientEmail: string;
  status: 'Sent' | 'Failed' | 'Opened';
  errorMessage?: string;
  createdAt: string;
}

export interface EmailLogEntry {
  id: string;
  campaignId: string;
  recipientEmail: string;
  status: 'Sent' | 'Failed' | 'Opened';
  errorMessage?: string;
  createdAt: string;
}

export interface EmailSequence {
  id: string;
  name: string;
  description?: string;
  triggerType: 'OnSignup' | 'Manual';
  status: 'Active' | 'Draft' | 'Paused';
  createdAt: string;
}

export interface SequenceStep {
  id: string;
  sequenceId: string;
  stepOrder: number;
  type: 'Email' | 'Delay';
  delayValue?: number;
  delayUnit?: 'Hours' | 'Days';
  emailSubject?: string;
  emailContent?: string;
}

export interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  userEmail: string;
  currentStepOrder: number;
  nextExecutionAt?: string;
  status: 'Active' | 'Completed' | 'Cancelled';
}

export interface Task {
    id: string;
    title: string;
    description: string;
    assignedTo?: string; // Mapped from assigned_to
    createdBy: string; // Mapped from created_by
    dueDate?: string; // Mapped from due_date
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    created_at: string; // Mapped from created_at
    leadId?: string; // Link to a Lead
    leadName?: string; // Mapped Lead Name
    tags?: string[]; // Array of tags
    categoryId?: string; // Mapped from category_id
    category?: { name: string; color: string; }; // Joined category data
    // WhatsApp Automation
    isWhatsappSchedule?: boolean; // Mapped from is_whatsapp_schedule
    whatsappMessageBody?: string; // Mapped from whatsapp_message_body
    whatsappTemplateId?: string; // Mapped from whatsapp_template_id
    whatsappStatus?: 'PENDING' | 'SENT' | 'FAILED'; // Mapped from whatsapp_status
    whatsappMediaUrl?: string; // Mapped from whatsapp_media_url
}

export interface TaskCategory {
    id: string;
    name: string;
    color: string;
    createdAt?: string;
}

export interface UserIntegration {
    id: string;
    userId: string; // Mapped from user_id
    instanceName: string; // Mapped from instance_name
    instanceStatus: string; // Mapped from instance_status
    updatedAt: string; // Mapped from updated_at
}

export interface MessageTemplate {
    id: string;
    title: string;
    content: string;
    createdBy?: string;
    createdAt: string;
}

// --- NEW: Stock & Logistics ---

export interface Product {
    id: string;
    sku: string;
    name: string;
    description?: string;
    category?: string;
    type: 'product' | 'raw_material' | 'service';
    unit: string;
    averageCost: number;
    salePrice: number;
    minStock: number;
    currentStock: number;
    productionTime?: number;
    imageUrl?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    createdAt: string;
}

export interface StockMovement {
    id: string;
    productId: string;
    type: 'IN' | 'OUT' | 'RESERVED' | 'ADJUST';
    quantity: number;
    origin?: string;
    referenceId?: string;
    userId?: string;
    notes?: string;
    createdAt: string;
}

export interface ProductBOM {
    id: string;
    parentProductId: string;
    componentId: string;
    quantity: number;
}

export interface Sale {
    id: string;
    clientId?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    channel: 'Store' | 'Admin' | 'Course' | 'Workshop';
    status: 'pending' | 'paid' | 'producing' | 'shipped' | 'delivered' | 'cancelled';
    totalValue: number;
    paymentMethod?: string;
    paymentStatus?: string;
    shippingStatus?: string;
    notes?: string;
    createdAt: string;
}

export interface SaleItem {
    id: string;
    saleId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    costSnapshot?: number;
}

export interface Shipment {
    id: string;
    saleId: string;
    carrier?: string;
    trackingCode?: string;
    shippingCost?: number;
    shippedAt?: string;
    deliveredAt?: string;
    status: string;
}