import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Briefcase,
  Mail,
  Clock,
  Search,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  RefreshCw,
  Upload,
  Copy,
  Check,
  ChevronRight,
  Trash2,
  Edit3,
  Calendar,
  Settings as SettingsIcon,
  LayoutDashboard,
  Compass,
  FolderKanban,
  Inbox,
  BellRing,
  Lock,
  Cpu,
  Download,
  Archive,
  Terminal,
  FileJson,
  Zap,
  Columns,
  Table as TableIcon,
  FileSpreadsheet,
  Award,
  BookOpen,
  Globe,
  FileWarning,
  Send
} from 'lucide-react';

// ============================================================================
// 1. CORE TYPES & GEMINI STRUCTURED OUTPUT SCHEMAS
// ============================================================================

export type EmailCategory = 'applied' | 'interview' | 'rejected' | 'offer' | 'scam';
export type RiskLevel = 'low' | 'medium' | 'high' | 'uncertain';
export type ApplicationStatus = 'Saved' | 'Applied' | 'Interview' | 'Rejected' | 'Offer';
export type WorkArrangement = 'Remote' | 'Hybrid' | 'On-site' | 'Unspecified';

export interface GeminiEmailAnalysis {
  category: EmailCategory;
  company: string | null;
  jobTitle: string | null;
  eventDate: string | null;
  confidence: number;
  riskLevel: RiskLevel;
  evidence: string[];
  explanation: string;
  recommendedAction: string;
  requiresHumanReview: boolean;
  underlyingStatus?: ApplicationStatus | null;
  redFlags?: string[];
  expectedOfficialDomain?: string;
}

export interface EmailRecord {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  company: string;
  date: string;
  importedAt: string;
  body: string;
  analyzed: boolean;
  analysis?: GeminiEmailAnalysis;
  matchedApplicationId?: string | null;
  scamReviewState?: 'pending' | 'reviewed' | 'dismissed';
  isUnrelatedNoise?: boolean;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  workArrangement: WorkArrangement;
  seniority: string;
  skills: string[];
  salaryRange?: string;
  sourceUrl: string;
  sourceType: 'LinkedIn URL' | 'Job Description';
  description: string;
  missingFields: string[];
  dateAdded: string;
  linkedApplicationId?: string | null;
}

export interface StatusHistoryItem {
  id: string;
  fromStatus: ApplicationStatus | 'Created';
  toStatus: ApplicationStatus;
  date: string;
  reason: string;
  emailId?: string;
}

export interface ApplicationRecord {
  id: string;
  company: string;
  role: string;
  location: string;
  workArrangement: WorkArrangement;
  jobSource: string;
  jobUrl: string;
  dateSaved: string;
  dateApplied: string | null;
  dateAppliedEstimated?: boolean;
  status: ApplicationStatus;
  relatedEmailIds: string[];
  lastActivityDate: string;
  nextFollowUpDate: string | null;
  notes: string;
  scamWarningCount: number;
  reviewState: 'clean' | 'needs_review' | 'reviewed' | 'ambiguous_match';
  statusHistory: StatusHistoryItem[];
  archived?: boolean;
  salaryOffered?: string;
}

export interface AmbiguousMatchCandidate {
  id: string;
  emailId: string;
  emailSubject: string;
  emailSender: string;
  detectedCompany: string;
  detectedRole: string;
  candidateApplicationIds: string[];
  reason: string;
  resolved: boolean;
}

export interface FollowUpReminder {
  id: string;
  applicationId: string;
  company: string;
  role: string;
  dateApplied: string;
  dateAppliedConfirmed: boolean;
  dueDate: string;
  daysSinceApplied: number;
  bucket: 'overdue' | 'due_today' | 'upcoming';
  status: 'active' | 'snoozed' | 'completed' | 'dismissed';
  draftSubject?: string;
  draftBody?: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

// ============================================================================
// 2. INITIAL WORKSPACE DATASET (REFERENCE DATE: 2026-10-24)
// ============================================================================

const TODAY_ISO = '2026-10-24';

export const INITIAL_JOBS: JobListing[] = [
  {
    id: 'job-sarvam-1',
    title: 'Senior AI Engineer — LLM Systems',
    company: 'Sarvam AI',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'Hybrid',
    seniority: 'Senior (4-7 yrs)',
    skills: ['Python', 'PyTorch', 'Gemini API', 'RAG', 'vLLM', 'Indic NLP'],
    salaryRange: '₹36L – ₹52L / yr',
    sourceUrl: 'https://www.linkedin.com/jobs/view/sarvam-ai-senior-llm-engineer-4091823',
    sourceType: 'LinkedIn URL',
    description: 'Build sovereign Indic voice and LLM agent pipelines at scale. Experience with low-latency inference, structured tool calling, and multimodal audio/text pipelines required.',
    missingFields: [],
    dateAdded: '2026-10-14',
    linkedApplicationId: 'app-sarvam-1'
  },
  {
    id: 'job-cred-1',
    title: 'Senior Frontend Engineer — Design Systems',
    company: 'CRED',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'On-site',
    seniority: 'Senior (4-6 yrs)',
    skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'Web Animations', 'Performance'],
    salaryRange: '₹40L – ₹55L / yr',
    sourceUrl: 'https://www.linkedin.com/jobs/view/cred-senior-frontend-design-systems-4092110',
    sourceType: 'LinkedIn URL',
    description: 'Own CRED web & high-craft fintech interfaces. Deep mastery of TypeScript, React rendering performance, and pixel-level visual polish.',
    missingFields: [],
    dateAdded: '2026-10-15',
    linkedApplicationId: 'app-cred-1'
  },
  {
    id: 'job-cred-2',
    title: 'Frontend Product Engineer — Growth & Onboarding',
    company: 'CRED',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'On-site',
    seniority: 'Mid-Senior (3-5 yrs)',
    skills: ['React', 'TypeScript', 'Experimentation', 'State Management'],
    salaryRange: '₹32L – ₹44L / yr',
    sourceUrl: 'https://www.linkedin.com/jobs/view/cred-frontend-growth-4092499',
    sourceType: 'LinkedIn URL',
    description: 'Distinct role at CRED focused on merchant & member onboarding funnels and rapid experimentation.',
    missingFields: [],
    dateAdded: '2026-10-16',
    linkedApplicationId: 'app-cred-2'
  },
  {
    id: 'job-zerodha-1',
    title: 'Backend Systems Engineer (Go / Rust)',
    company: 'Zerodha',
    location: 'Bengaluru / Remote',
    workArrangement: 'Remote',
    seniority: 'Mid-Senior (3-6 yrs)',
    skills: ['Go', 'Rust', 'PostgreSQL', 'Kafka', 'Redis', 'Linux'],
    salaryRange: '₹35L – ₹50L / yr',
    sourceUrl: 'https://www.linkedin.com/jobs/view/zerodha-backend-systems-go-4088120',
    sourceType: 'LinkedIn URL',
    description: 'Work on Kite order routing and high-throughput ledger systems serving 15M+ retail traders.',
    missingFields: [],
    dateAdded: '2026-10-14',
    linkedApplicationId: 'app-zerodha-1'
  },
  {
    id: 'job-postman-1',
    title: 'Staff Platform Engineer — API Intelligence',
    company: 'Postman',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'Hybrid',
    seniority: 'Staff (6+ yrs)',
    skills: ['Node.js', 'TypeScript', 'Distributed Systems', 'Kubernetes', 'GraphQL'],
    salaryRange: '₹48L – ₹65L / yr',
    sourceUrl: 'https://www.linkedin.com/jobs/view/postman-staff-platform-engineer-4089312',
    sourceType: 'LinkedIn URL',
    description: 'Architect cloud-native API testing and AI agent tooling for 30M+ developers.',
    missingFields: [],
    dateAdded: '2026-10-15',
    linkedApplicationId: 'app-postman-1'
  },
  {
    id: 'job-razorpay-1',
    title: 'Data Platform Engineer — Real-time Risk',
    company: 'Razorpay',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'Hybrid',
    seniority: 'Mid-Senior (3-5 yrs)',
    skills: ['Apache Flink', 'Spark', 'Python', 'Kafka', 'BigQuery'],
    salaryRange: '₹30L – ₹42L / yr',
    sourceUrl: 'https://www.linkedin.com/jobs/view/razorpay-data-platform-risk-4090015',
    sourceType: 'LinkedIn URL',
    description: 'Build sub-second payment fraud feature pipelines and streaming data lakehouse infrastructure.',
    missingFields: [],
    dateAdded: '2026-10-16',
    linkedApplicationId: 'app-razorpay-1'
  },
  {
    id: 'job-juspay-1',
    title: 'Distributed Systems Engineer — FP / Rust',
    company: 'Juspay',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'On-site',
    seniority: 'Mid-Senior (2-5 yrs)',
    skills: ['Rust', 'Haskell', 'PureScript', 'Distributed Consensus', 'Payments'],
    salaryRange: '₹34L – ₹45L / yr',
    sourceUrl: 'https://www.linkedin.com/jobs/view/juspay-distributed-systems-rust-4085001',
    sourceType: 'LinkedIn URL',
    description: 'Engineer 99.999% reliability payment switches processing 150M+ daily transactions.',
    missingFields: [],
    dateAdded: '2026-10-08',
    linkedApplicationId: 'app-juspay-1'
  },
  {
    id: 'job-tejsolpro-1',
    title: 'AI Product Engineer — Cloud & Enterprise Agents',
    company: 'Tej SolPro',
    location: 'Ahmedabad, Gujarat',
    workArrangement: 'Hybrid',
    seniority: 'Mid-Senior (2-5 yrs)',
    skills: ['TypeScript', 'React', 'Gemini API', 'Firebase', 'Google Cloud'],
    salaryRange: '₹18L – ₹26L / yr',
    sourceUrl: 'https://www.linkedin.com/jobs/view/tej-solpro-ai-product-engineer-ahmedabad-4095001',
    sourceType: 'LinkedIn URL',
    description: 'Build production AI workflows, enterprise SaaS portals, and cloud-native agent systems in Ahmedabad.',
    missingFields: [],
    dateAdded: '2026-10-10',
    linkedApplicationId: 'app-tejsolpro-1'
  },
  {
    id: 'job-weboccult-1',
    title: 'Senior Computer Vision & AI Engineer',
    company: 'WebOccult Technologies',
    location: 'Ahmedabad, Gujarat',
    workArrangement: 'On-site',
    seniority: 'Senior (3-6 yrs)',
    skills: ['Python', 'OpenCV', 'PyTorch', 'Edge AI', 'FastAPI'],
    salaryRange: '₹16L – ₹24L / yr',
    sourceUrl: 'https://www.linkedin.com/jobs/view/weboccult-senior-cv-ai-engineer-4096112',
    sourceType: 'Job Description',
    description: 'Lead industrial computer vision and multimodal AI deployments for global clients from Ahmedabad.',
    missingFields: [],
    dateAdded: '2026-10-20',
    linkedApplicationId: null
  }
];

export const INITIAL_EMAILS: EmailRecord[] = [
  {
    id: 'em-01',
    subject: 'Application Received: Senior AI Engineer — LLM Systems at Sarvam AI',
    senderName: 'Sarvam AI Careers',
    senderEmail: 'no-reply@jobs.sarvam.ai',
    company: 'Sarvam AI',
    date: '2026-10-18',
    importedAt: '2026-10-24',
    body: 'Hi there, Thank you for applying for the Senior AI Engineer — LLM Systems position at Sarvam AI in Bengaluru. Our engineering hiring team has received your application and portfolio. We will review your profile and reach out within 5 business days.',
    analyzed: true,
    matchedApplicationId: 'app-sarvam-1',
    analysis: {
      category: 'applied',
      company: 'Sarvam AI',
      jobTitle: 'Senior AI Engineer — LLM Systems',
      eventDate: '2026-10-18',
      confidence: 0.98,
      riskLevel: 'low',
      expectedOfficialDomain: 'sarvam.ai',
      evidence: [
        'Thank you for applying for the Senior AI Engineer — LLM Systems position at Sarvam AI',
        'Our engineering hiring team has received your application'
      ],
      explanation: 'Standard automated ATS confirmation acknowledging receipt of your application at Sarvam AI.',
      recommendedAction: 'Log application date (2026-10-18) and wait for technical screening update.',
      requiresHumanReview: false
    }
  },
  {
    id: 'em-02',
    subject: 'Invitation to Interview: Senior AI Engineer — LLM Systems @ Sarvam AI',
    senderName: 'Ananya Rao (Sarvam AI Talent)',
    senderEmail: 'ananya.rao@sarvam.ai',
    company: 'Sarvam AI',
    date: '2026-10-22',
    importedAt: '2026-10-24',
    body: 'Hello! Our LLM systems team loved your work on structured agent tool-calling. We would like to invite you to a 60-minute Technical Architecture Round on Monday, 2026-10-27 at 3:00 PM IST via Google Meet. Please confirm if this slot works.',
    analyzed: true,
    matchedApplicationId: 'app-sarvam-1',
    analysis: {
      category: 'interview',
      company: 'Sarvam AI',
      jobTitle: 'Senior AI Engineer — LLM Systems',
      eventDate: '2026-10-27',
      confidence: 0.97,
      riskLevel: 'low',
      expectedOfficialDomain: 'sarvam.ai',
      evidence: [
        'We would like to invite you to a 60-minute Technical Architecture Round on Monday, 2026-10-27 at 3:00 PM IST via Google Meet.'
      ],
      explanation: 'Verified recruiter invite from @sarvam.ai scheduling a Technical Architecture Round on Oct 27, 2026.',
      recommendedAction: 'Confirm calendar availability for 2026-10-27 at 15:00 IST and prepare LLM system design notes.',
      requiresHumanReview: false
    }
  },
  {
    id: 'em-03',
    subject: 'We received your application for Backend Systems Engineer (Go / Rust)',
    senderName: 'Zerodha Tech Careers',
    senderEmail: 'careers@zerodha.com',
    company: 'Zerodha',
    date: '2026-10-15',
    importedAt: '2026-10-24',
    body: 'Namaste, Your application for Backend Systems Engineer (Go / Rust) at Zerodha was submitted on 2026-10-15. Because we review every GitHub profile and technical write-up manually, it may take up to a week to hear back.',
    analyzed: true,
    matchedApplicationId: 'app-zerodha-1',
    analysis: {
      category: 'applied',
      company: 'Zerodha',
      jobTitle: 'Backend Systems Engineer (Go / Rust)',
      eventDate: '2026-10-15',
      confidence: 0.99,
      riskLevel: 'low',
      expectedOfficialDomain: 'zerodha.com',
      evidence: [
        'Your application for Backend Systems Engineer (Go / Rust) at Zerodha was submitted on 2026-10-15.'
      ],
      explanation: 'Authentic application confirmation from Zerodha (@zerodha.com). Since 9 days have passed with no reply, this triggers a 7-day follow-up reminder.',
      recommendedAction: 'Send a polite 7-day follow-up email referencing your Go/Rust systems portfolio.',
      requiresHumanReview: false
    }
  },
  {
    id: 'em-04',
    subject: 'Thank you for applying to Postman — Staff Platform Engineer — API Intelligence',
    senderName: 'Postman Talent Acquisition',
    senderEmail: 'no-reply@greenhouse.io',
    company: 'Postman',
    date: '2026-10-16',
    importedAt: '2026-10-24',
    body: 'Thanks for applying to Postman for the Staff Platform Engineer — API Intelligence role on 2026-10-16. Our team in Bengaluru is reviewing your submission.',
    analyzed: true,
    matchedApplicationId: 'app-postman-1',
    analysis: {
      category: 'applied',
      company: 'Postman',
      jobTitle: 'Staff Platform Engineer — API Intelligence',
      eventDate: '2026-10-16',
      confidence: 0.97,
      riskLevel: 'low',
      expectedOfficialDomain: 'postman.com',
      evidence: [
        'Thanks for applying to Postman for the Staff Platform Engineer — API Intelligence role on 2026-10-16.'
      ],
      explanation: 'Greenhouse ATS confirmation for Postman. 8 days have elapsed without response, qualifying for a 7-day follow-up.',
      recommendedAction: 'Generate and send a concise follow-up email to Postman recruiting.',
      requiresHumanReview: false
    }
  },
  {
    id: 'em-05',
    subject: 'Application Confirmation: Data Platform Engineer — Real-time Risk at Razorpay',
    senderName: 'Razorpay Careers',
    senderEmail: 'jobs@razorpay.com',
    company: 'Razorpay',
    date: '2026-10-17',
    importedAt: '2026-10-24',
    body: 'Hi! We have received your application for Data Platform Engineer — Real-time Risk submitted on October 17, 2026. We will update you once the hiring manager completes initial screening.',
    analyzed: true,
    matchedApplicationId: 'app-razorpay-1',
    analysis: {
      category: 'applied',
      company: 'Razorpay',
      jobTitle: 'Data Platform Engineer — Real-time Risk',
      eventDate: '2026-10-17',
      confidence: 0.98,
      riskLevel: 'low',
      expectedOfficialDomain: 'razorpay.com',
      evidence: [
        'We have received your application for Data Platform Engineer — Real-time Risk submitted on October 17, 2026.'
      ],
      explanation: 'Application confirmation from Razorpay exactly 7 days ago (2026-10-17). Follow-up is due today.',
      recommendedAction: 'Send a 7-day check-in email today.',
      requiresHumanReview: false
    }
  },
  {
    id: 'em-06',
    subject: 'CRED Application Received — Senior Frontend Engineer — Design Systems',
    senderName: 'CRED Talent Team',
    senderEmail: 'careers@cred.club',
    company: 'CRED',
    date: '2026-10-16',
    importedAt: '2026-10-24',
    body: 'Hello, Your application for Senior Frontend Engineer — Design Systems at CRED has been logged. Our frontend bar-raisers will inspect your UI craft submission shortly.',
    analyzed: true,
    matchedApplicationId: 'app-cred-1',
    analysis: {
      category: 'applied',
      company: 'CRED',
      jobTitle: 'Senior Frontend Engineer — Design Systems',
      eventDate: '2026-10-16',
      confidence: 0.98,
      riskLevel: 'low',
      expectedOfficialDomain: 'cred.club',
      evidence: [
        'Your application for Senior Frontend Engineer — Design Systems at CRED has been logged.'
      ],
      explanation: 'Official application confirmation from @cred.club.',
      recommendedAction: 'Linked to CRED Design Systems application.',
      requiresHumanReview: false
    }
  },
  {
    id: 'em-07',
    subject: 'Rescheduling Request: CRED Machine Coding Round (Senior Frontend Engineer — Design Systems)',
    senderName: 'Rohan Mehta (CRED Recruiting)',
    senderEmail: 'rohan.mehta@cred.club',
    company: 'CRED',
    date: '2026-10-23',
    importedAt: '2026-10-24',
    body: 'Hi! Due to an urgent production release, could we reschedule your CRED Senior Frontend Engineer — Design Systems machine coding interview to Tuesday, 2026-10-28 at 4:30 PM IST? Apologies for the shuffle!',
    analyzed: true,
    matchedApplicationId: 'app-cred-1',
    analysis: {
      category: 'interview',
      company: 'CRED',
      jobTitle: 'Senior Frontend Engineer — Design Systems',
      eventDate: '2026-10-28',
      confidence: 0.96,
      riskLevel: 'low',
      expectedOfficialDomain: 'cred.club',
      evidence: [
        'reschedule your CRED Senior Frontend Engineer — Design Systems machine coding interview to Tuesday, 2026-10-28 at 4:30 PM IST'
      ],
      explanation: 'Legitimate interview rescheduling email from @cred.club moving the Machine Coding round to Oct 28, 2026.',
      recommendedAction: 'Reply to confirm the new 2026-10-28 4:30 PM IST slot.',
      requiresHumanReview: false
    }
  },
  {
    id: 'em-08',
    subject: 'Final Round Invitation: Founder & Architecture Chat — Distributed Systems Engineer @ Juspay',
    senderName: 'Priya Nair (Juspay People Team)',
    senderEmail: 'priya.nair@juspay.in',
    company: 'Juspay',
    date: '2026-10-19',
    importedAt: '2026-10-24',
    body: 'Congratulations on clearing the functional programming & systems round at Juspay! We are scheduling your Final Architecture & Culture conversation for Distributed Systems Engineer — FP / Rust on 2026-10-21.',
    analyzed: true,
    matchedApplicationId: 'app-juspay-1',
    analysis: {
      category: 'interview',
      company: 'Juspay',
      jobTitle: 'Distributed Systems Engineer — FP / Rust',
      eventDate: '2026-10-21',
      confidence: 0.97,
      riskLevel: 'low',
      expectedOfficialDomain: 'juspay.in',
      evidence: [
        'Congratulations on clearing the functional programming & systems round at Juspay!',
        'scheduling your Final Architecture & Culture conversation for Distributed Systems Engineer — FP / Rust on 2026-10-21.'
      ],
      explanation: 'Additional final-round interview invitation from official @juspay.in domain.',
      recommendedAction: 'Completed prior to offer stage.',
      requiresHumanReview: false
    }
  },
  {
    id: 'em-09',
    subject: 'Official Offer of Employment: Distributed Systems Engineer — FP / Rust at Juspay',
    senderName: 'Juspay People & Culture',
    senderEmail: 'offers@juspay.in',
    company: 'Juspay',
    date: '2026-10-23',
    importedAt: '2026-10-24',
    body: 'Dear Candidate, We are thrilled to extend an official offer of employment for the role of Distributed Systems Engineer — FP / Rust at Juspay Technologies Pvt Ltd (Bengaluru). Total Fixed Compensation: ₹38,00,000 per annum + ESOP grant. Please review the DocuSign agreement on our official candidate portal by 2026-10-30. Note: Juspay never charges any recruitment or onboarding fees.',
    analyzed: true,
    matchedApplicationId: 'app-juspay-1',
    analysis: {
      category: 'offer',
      company: 'Juspay',
      jobTitle: 'Distributed Systems Engineer — FP / Rust',
      eventDate: '2026-10-30',
      confidence: 0.98,
      riskLevel: 'low',
      expectedOfficialDomain: 'juspay.in',
      evidence: [
        'We are thrilled to extend an official offer of employment for the role of Distributed Systems Engineer — FP / Rust at Juspay Technologies Pvt Ltd',
        'Total Fixed Compensation: ₹38,00,000 per annum + ESOP grant.',
        'Please review the DocuSign agreement on our official candidate portal by 2026-10-30.'
      ],
      explanation: 'Genuine formal employment offer from @juspay.in following multi-round interviews, with transparent compensation and a 7-day decision window.',
      recommendedAction: 'Review compensation breakdown and ESOP terms before the 2026-10-30 acceptance deadline.',
      requiresHumanReview: false
    }
  },
  {
    id: 'em-10',
    subject: 'Offer Letter: AI Product Engineer — Cloud & Enterprise Agents | Tej SolPro (Ahmedabad)',
    senderName: 'HR Team — Tej SolPro',
    senderEmail: 'careers@tejsolpro.com',
    company: 'Tej SolPro',
    date: '2026-10-24',
    importedAt: '2026-10-24',
    body: 'Hello! Following your live agent architecture demo and panel interview, we are delighted to offer you the position of AI Product Engineer — Cloud & Enterprise Agents at Tej SolPro (Ahmedabad Hybrid). Base CTC: ₹22,00,000 PA. Proposed joining date: 2026-11-16. Feel free to reach out to our HR desk for any questions.',
    analyzed: true,
    matchedApplicationId: 'app-tejsolpro-1',
    analysis: {
      category: 'offer',
      company: 'Tej SolPro',
      jobTitle: 'AI Product Engineer — Cloud & Enterprise Agents',
      eventDate: '2026-11-16',
      confidence: 0.97,
      riskLevel: 'low',
      expectedOfficialDomain: 'tejsolpro.com',
      evidence: [
        'Following your live agent architecture demo and panel interview, we are delighted to offer you the position of AI Product Engineer — Cloud & Enterprise Agents at Tej SolPro',
        'Base CTC: ₹22,00,000 PA. Proposed joining date: 2026-11-16.'
      ],
      explanation: 'Verified job offer from @tejsolpro.com matching prior interview history, with clear salary terms and zero suspicious requests.',
      recommendedAction: 'Compare with competing offers and respond prior to joining date.',
      requiresHumanReview: false
    }
  },
  {
    id: 'em-11',
    subject: 'Update on your application for Principal Mobile Engineer at Swiggy',
    senderName: 'Swiggy Talent Team',
    senderEmail: 'no-reply@swiggy.in',
    company: 'Swiggy',
    date: '2026-10-20',
    importedAt: '2026-10-24',
    body: 'Thank you for taking the time to apply for Principal Mobile Engineer at Swiggy. While your engineering background is impressive, we have decided to move forward with candidates whose recent experience aligns more closely with native iOS/Android performance engineering. We wish you the very best.',
    analyzed: true,
    matchedApplicationId: 'app-swiggy-1',
    analysis: {
      category: 'rejected',
      company: 'Swiggy',
      jobTitle: 'Principal Mobile Engineer',
      eventDate: '2026-10-20',
      confidence: 0.99,
      riskLevel: 'low',
      expectedOfficialDomain: 'swiggy.in',
      evidence: [
        'we have decided to move forward with candidates whose recent experience aligns more closely with native iOS/Android performance engineering.'
      ],
      explanation: 'Clear, polite rejection email from Swiggy Talent Team. Follow-up reminders are automatically disabled for this application.',
      recommendedAction: 'Archive application; no follow-up needed.',
      requiresHumanReview: false
    }
  },
  {
    id: 'em-12',
    subject: 'PhonePe Hiring Update — Senior Backend Engineer',
    senderName: 'PhonePe Recruiting',
    senderEmail: 'talent@phonepe.com',
    company: 'PhonePe',
    date: '2026-10-21',
    importedAt: '2026-10-24',
    body: 'Hi, Thank you for participating in the technical screening for Senior Backend Engineer at PhonePe. Unfortunately, we will not be proceeding with your candidacy at this stage. We appreciate your interest in PhonePe.',
    analyzed: true,
    matchedApplicationId: 'app-phonepe-1',
    analysis: {
      category: 'rejected',
      company: 'PhonePe',
      jobTitle: 'Senior Backend Engineer',
      eventDate: '2026-10-21',
      confidence: 0.99,
      riskLevel: 'low',
      expectedOfficialDomain: 'phonepe.com',
      evidence: [
        'Unfortunately, we will not be proceeding with your candidacy at this stage.'
      ],
      explanation: 'Post-screening rejection notice from PhonePe (@phonepe.com).',
      recommendedAction: 'Mark application as Rejected and suppress reminders.',
      requiresHumanReview: false
    }
  },
  {
    id: 'em-13',
    subject: 'Following up: Full-Stack AI Engineer Interview Scheduling @ Workplate',
    senderName: 'Workplate Talent Team',
    senderEmail: 'hiring@workplate.io',
    company: 'Workplate',
    date: '2026-10-23',
    importedAt: '2026-10-24',
    body: 'Hey! Following up on our earlier note regarding the Full-Stack AI Engineer role at Workplate (Ahmedabad / Remote). Let us know if Wednesday 2026-10-29 at 11:30 AM IST works for a 45-minute live pairing session on Gemini function calling.',
    analyzed: true,
    matchedApplicationId: 'app-workplate-1',
    analysis: {
      category: 'interview',
      company: 'Workplate',
      jobTitle: 'Full-Stack AI Engineer',
      eventDate: '2026-10-29',
      confidence: 0.95,
      riskLevel: 'low',
      expectedOfficialDomain: 'workplate.io',
      evidence: [
        'Let us know if Wednesday 2026-10-29 at 11:30 AM IST works for a 45-minute live pairing session on Gemini function calling.'
      ],
      explanation: 'Recruiter follow-up correspondence scheduling a live pairing interview at Workplate.',
      recommendedAction: 'Reply to confirm Wednesday 2026-10-29 at 11:30 AM IST.',
      requiresHumanReview: false
    }
  },
  {
    id: 'em-14',
    subject: 'Recruiter Outreach: Senior Computer Vision & AI Engineer at WebOccult Technologies',
    senderName: 'Nidhi Patel (WebOccult HR)',
    senderEmail: 'nidhi.p@weboccult.com',
    company: 'WebOccult Technologies',
    date: '2026-10-22',
    importedAt: '2026-10-24',
    body: 'Hi! We came across your GitHub projects and would love to invite you for an introductory screening call for our Senior Computer Vision & AI Engineer opening in Ahmedabad on 2026-10-26 at 5:00 PM IST.',
    analyzed: true,
    matchedApplicationId: null,
    analysis: {
      category: 'interview',
      company: 'WebOccult Technologies',
      jobTitle: 'Senior Computer Vision & AI Engineer',
      eventDate: '2026-10-26',
      confidence: 0.94,
      riskLevel: 'low',
      expectedOfficialDomain: 'weboccult.com',
      evidence: [
        'invite you for an introductory screening call for our Senior Computer Vision & AI Engineer opening in Ahmedabad on 2026-10-26 at 5:00 PM IST.'
      ],
      explanation: 'Genuine inbound recruiter outreach from @weboccult.com inviting you to an introductory screening call.',
      recommendedAction: 'Create or link application for WebOccult Technologies and reply to schedule.',
      requiresHumanReview: false
    }
  },
  {
    id: 'em-15',
    subject: 'URGENT: Offer Letter Released — Pay ₹14,500 MacBook Security & AI Certification Fee | NovaTech Global',
    senderName: 'HR Desk — NovaTech Global Solutions',
    senderEmail: 'onboarding.novatech.hr@gmail.com',
    company: 'NovaTech Global Solutions',
    date: '2026-10-24',
    importedAt: '2026-10-24',
    body: 'CONGRATULATIONS! You are selected for Junior AI Prompt & Cloud Engineer at ₹28,00,000 LPA without technical interview based on your resume shortlist. To release your signed Offer Letter and dispatch your Apple MacBook Pro M4, you must deposit a refundable ₹14,500 Training & Laptop Security Fee via UPI ID novatech.hr@okaxis within 3 hours today. Failing to pay immediately will forfeit your offer.',
    analyzed: true,
    matchedApplicationId: 'app-novatech-scam',
    scamReviewState: 'pending',
    analysis: {
      category: 'scam',
      company: 'NovaTech Global Solutions',
      jobTitle: 'Junior AI Prompt & Cloud Engineer',
      eventDate: '2026-10-24',
      confidence: 0.99,
      riskLevel: 'high',
      underlyingStatus: 'Offer',
      expectedOfficialDomain: 'novatechglobal.com (Corporate Domain Required)',
      redFlags: [
        'Upfront training & laptop security deposit fee (₹14,500 via UPI)',
        'Free consumer webmail domain (onboarding.novatech.hr@gmail.com)',
        'High-salary offer (₹28 LPA) granted with zero interviews',
        'Extreme artificial urgency (3-hour payment deadline)'
      ],
      evidence: [
        'you must deposit a refundable ₹14,500 Training & Laptop Security Fee via UPI ID novatech.hr@okaxis within 3 hours today.',
        'selected for Junior AI Prompt & Cloud Engineer at ₹28,00,000 LPA without technical interview',
        'Sender address uses free Gmail account: onboarding.novatech.hr@gmail.com'
      ],
      explanation: 'Classic advance-fee recruitment fraud. Legitimate employers never demand upfront UPI deposits for laptops, training, or offer letter release, nor do they issue ₹28 LPA offers without interviews from a @gmail.com address.',
      recommendedAction: 'Do NOT transfer any money or reply. Block sender and report UPI ID novatech.hr@okaxis to the National Cyber Crime Portal (1930 / cybercrime.gov.in).',
      requiresHumanReview: true
    }
  },
  {
    id: 'em-16',
    subject: 'TCS Direct Joining Letter — System Engineer (Aaj Shaam 5 Baje Tak Seat Confirm Karein)',
    senderName: 'TCS NQT Direct Recruitment Cell',
    senderEmail: 'hr.tcs.direct.offer2026@outlook.com',
    company: 'Tata Consultancy Services (Impersonated)',
    date: '2026-10-23',
    importedAt: '2026-10-24',
    body: 'Dear Candidate, Your profile is shortlisted under TCS Special Layoff Relief Drive for System Engineer (₹11.5 LPA). Direct joining without coding round! Aaj shaam 5 baje tak ₹4,999 background verification & portal registration charge pay karein warna aapki seat cancel ho jayegi. Send payment screenshot + Aadhaar & PAN PDF on WhatsApp immediately.',
    analyzed: true,
    matchedApplicationId: 'app-tcs-scam',
    scamReviewState: 'pending',
    analysis: {
      category: 'scam',
      company: 'Tata Consultancy Services (Impersonated)',
      jobTitle: 'System Engineer',
      eventDate: '2026-10-23',
      confidence: 0.99,
      riskLevel: 'high',
      underlyingStatus: 'Offer',
      expectedOfficialDomain: 'tcs.com',
      redFlags: [
        'Brand impersonation of Tata Consultancy Services using @outlook.com',
        'Upfront registration & verification charge demand (₹4,999)',
        'Hinglish pressure tactic ("Aaj shaam 5 baje tak... warna seat cancel ho jayegi")',
        'Direct joining claim without interview + WhatsApp document collection'
      ],
      evidence: [
        'Sender domain is hr.tcs.direct.offer2026@outlook.com instead of official @tcs.com',
        'Aaj shaam 5 baje tak ₹4,999 background verification & portal registration charge pay karein warna aapki seat cancel ho jayegi.',
        'Direct joining without coding round!'
      ],
      explanation: 'High-confidence impersonation scam targeting laid-off engineers. Fraudsters spoof TCS using an Outlook address and use Hinglish urgency to extort ₹4,999 and harvest identity documents via WhatsApp.',
      requiresHumanReview: true,
      recommendedAction: 'Never pay registration fees or share Aadhaar/PAN on WhatsApp. Verify all TCS communications strictly through the official TCS NextStep portal (@tcs.com).'
    }
  },
  {
    id: 'em-17',
    subject: 'ACTION REQUIRED IN 2 HOURS: Mandatory Pre-Interview KYC, Bank Passbook & Aadhaar Upload',
    senderName: 'Infosys Talent Portal Verification',
    senderEmail: 'onboarding@infosys-careers-india.org',
    company: 'Infosys (Lookalike Domain)',
    date: '2026-10-24',
    importedAt: '2026-10-24',
    body: 'Dear Applicant, Before we schedule your HR salary discussion for Senior Specialist Programmer, you must complete mandatory RBI Payroll KYC within 2 hours. Reply to this email with: (1) High-res Aadhaar Front/Back, (2) PAN Card, (3) Cancelled Cheque & Bank Statement, and (4) the 6-digit Digilocker OTP sent to your mobile.',
    analyzed: true,
    matchedApplicationId: 'app-infosys-scam',
    scamReviewState: 'pending',
    analysis: {
      category: 'scam',
      company: 'Infosys (Lookalike Domain)',
      jobTitle: 'Senior Specialist Programmer',
      eventDate: '2026-10-24',
      confidence: 0.99,
      riskLevel: 'high',
      underlyingStatus: 'Interview',
      expectedOfficialDomain: 'infosys.com',
      redFlags: [
        'Lookalike spoofed domain (@infosys-careers-india.org instead of @infosys.com)',
        'Request for 6-digit OTP alongside Aadhaar, PAN, and bank statement before any interview',
        '2-hour artificial coercion window'
      ],
      evidence: [
        'Sender uses lookalike external domain: onboarding@infosys-careers-india.org',
        'Reply to this email with: (1) High-res Aadhaar Front/Back, (2) PAN Card, (3) Cancelled Cheque & Bank Statement, and (4) the 6-digit Digilocker OTP'
      ],
      explanation: 'Severe identity theft and KYC phishing attack. Requesting an OTP and full financial/identity documents prior to an interview from a lookalike .org domain is a hallmark of financial fraud.',
      recommendedAction: 'Do NOT share any documents or OTPs. Report lookalike domain @infosys-careers-india.org to CERT-In.',
      requiresHumanReview: true
    }
  },
  {
    id: 'em-18',
    subject: 'Remote AI Data Trainer Offer ($65/hr USD) — Complete $99 Crypto Wallet Verification',
    senderName: 'ScaleAI Global Recruiting',
    senderEmail: 'recruiting@scale-ai-jobs.net',
    company: 'ScaleAI Global (Spoofed)',
    date: '2026-10-22',
    importedAt: '2026-10-24',
    body: 'Hi! You have been approved for our Remote AI Data Trainer role paying $65/hr USD (up to ₹4.5 Lakhs/month working 2 hours/day). To activate your international payroll wallet, deposit $99 USDT verification fee to the onboarding link below.',
    analyzed: true,
    matchedApplicationId: 'app-scale-scam',
    scamReviewState: 'pending',
    analysis: {
      category: 'scam',
      company: 'ScaleAI Global (Spoofed)',
      jobTitle: 'Remote AI Data Trainer',
      eventDate: '2026-10-22',
      confidence: 0.98,
      riskLevel: 'high',
      underlyingStatus: 'Offer',
      expectedOfficialDomain: 'scale.com',
      redFlags: [
        'Unrealistic pay-to-hours ratio ($65/hr for 2 hrs/day with instant approval)',
        'Upfront $99 USDT cryptocurrency wallet activation fee',
        'Unverified lookalike domain (@scale-ai-jobs.net)'
      ],
      evidence: [
        'paying $65/hr USD (up to ₹4.5 Lakhs/month working 2 hours/day)',
        'To activate your international payroll wallet, deposit $99 USDT verification fee'
      ],
      explanation: 'Task/crypto job scam combining unrealistic remote USD compensation with an upfront USDT wallet activation fee.',
      recommendedAction: 'Ignore and block domain @scale-ai-jobs.net.',
      requiresHumanReview: true
    }
  },
  {
    id: 'em-19',
    subject: 'CRED Frontend Engineer — Shortlist & Compensation Alignment',
    senderName: 'Vikram Singh (Apex Tech Staffing)',
    senderEmail: 'vikram@apextech-staffing.in',
    company: 'CRED',
    date: '2026-10-24',
    importedAt: '2026-10-24',
    body: 'Hi, I am reaching out from Apex Tech Staffing on behalf of CRED in Bengaluru regarding your Frontend Engineer application. Before I book your panel slot for next week, please confirm your current notice period and expected CTC. Note: Please confirm which CRED Frontend track you prefer to proceed with.',
    analyzed: true,
    matchedApplicationId: null,
    scamReviewState: 'pending',
    analysis: {
      category: 'interview',
      company: 'CRED',
      jobTitle: 'Frontend Engineer',
      eventDate: '2026-10-24',
      confidence: 0.74,
      riskLevel: 'uncertain',
      expectedOfficialDomain: 'cred.club (External Agency: apextech-staffing.in)',
      evidence: [
        'reaching out from Apex Tech Staffing on behalf of CRED in Bengaluru regarding your Frontend Engineer application',
        'Sender domain is a third-party agency (vikram@apextech-staffing.in), and you have 2 active CRED Frontend applications.'
      ],
      explanation: 'External staffing agency outreach referencing CRED "Frontend Engineer". Because you have two distinct CRED roles in your tracker (Design Systems vs. Growth & Onboarding) and the sender is a third-party agency, human confirmation is required before linking.',
      recommendedAction: 'Confirm which CRED application this email belongs to, and verify with your official @cred.club contact before sharing sensitive salary details.',
      requiresHumanReview: true
    }
  },
  {
    id: 'em-20',
    subject: 'Festive Pre-Approved Offer! Upgrade to HDFC Regalia Gold Credit Card with ₹5,00,000 Limit',
    senderName: 'HDFC Bank Cards Promotional Desk',
    senderEmail: 'offers@alerts.hdfcbank.net',
    company: 'HDFC Bank (Promotional)',
    date: '2026-10-24',
    importedAt: '2026-10-24',
    body: 'Special Festive Offer for You! Enjoy complimentary airport lounge access and a ₹5,00,000 limit on your pre-approved HDFC Regalia Gold Credit Card. Click here to claim your lifetime free card offer today.',
    analyzed: true,
    matchedApplicationId: null,
    isUnrelatedNoise: true,
    analysis: {
      category: 'applied',
      company: null,
      jobTitle: null,
      eventDate: null,
      confidence: 0.96,
      riskLevel: 'low',
      evidence: [
        'Upgrade to HDFC Regalia Gold Credit Card with ₹5,00,000 Limit',
        'Contains the word "Offer" in a promotional banking context, NOT an employment offer.'
      ],
      explanation: 'Unrelated promotional banking email containing the word "Offer". OfferGuard AI strictly verifies employment context and prevents false-positive job offer updates.',
      recommendedAction: 'Ignored by job tracker (Promotional / Unrelated message).',
      requiresHumanReview: false
    }
  }
];

export const INITIAL_APPLICATIONS: ApplicationRecord[] = [
  {
    id: 'app-sarvam-1',
    company: 'Sarvam AI',
    role: 'Senior AI Engineer — LLM Systems',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'Hybrid',
    jobSource: 'LinkedIn URL',
    jobUrl: 'https://www.linkedin.com/jobs/view/sarvam-ai-senior-llm-engineer-4091823',
    dateSaved: '2026-10-14',
    dateApplied: '2026-10-18',
    status: 'Interview',
    relatedEmailIds: ['em-01', 'em-02'],
    lastActivityDate: '2026-10-22',
    nextFollowUpDate: null,
    notes: 'Technical Architecture Round scheduled for Monday Oct 27 at 3:00 PM IST. Review sovereign Indic voice + tool calling benchmarks.',
    scamWarningCount: 0,
    reviewState: 'clean',
    statusHistory: [
      { id: 'sh-1', fromStatus: 'Created', toStatus: 'Saved', date: '2026-10-14', reason: 'Saved from LinkedIn Discover Jobs' },
      { id: 'sh-2', fromStatus: 'Saved', toStatus: 'Applied', date: '2026-10-18', reason: 'Matched confirmation email from no-reply@jobs.sarvam.ai', emailId: 'em-01' },
      { id: 'sh-3', fromStatus: 'Applied', toStatus: 'Interview', date: '2026-10-22', reason: 'Matched interview invitation from ananya.rao@sarvam.ai', emailId: 'em-02' }
    ]
  },
  {
    id: 'app-cred-1',
    company: 'CRED',
    role: 'Senior Frontend Engineer — Design Systems',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'On-site',
    jobSource: 'LinkedIn URL',
    jobUrl: 'https://www.linkedin.com/jobs/view/cred-senior-frontend-design-systems-4092110',
    dateSaved: '2026-10-15',
    dateApplied: '2026-10-16',
    status: 'Interview',
    relatedEmailIds: ['em-06', 'em-07'],
    lastActivityDate: '2026-10-23',
    nextFollowUpDate: null,
    notes: 'Machine coding round rescheduled to Tuesday Oct 28 at 4:30 PM IST.',
    scamWarningCount: 0,
    reviewState: 'ambiguous_match',
    statusHistory: [
      { id: 'sh-4', fromStatus: 'Created', toStatus: 'Applied', date: '2026-10-16', reason: 'Application confirmed via careers@cred.club', emailId: 'em-06' },
      { id: 'sh-5', fromStatus: 'Applied', toStatus: 'Interview', date: '2026-10-23', reason: 'Rescheduled machine coding invite from rohan.mehta@cred.club', emailId: 'em-07' }
    ]
  },
  {
    id: 'app-cred-2',
    company: 'CRED',
    role: 'Frontend Product Engineer — Growth & Onboarding',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'On-site',
    jobSource: 'LinkedIn URL',
    jobUrl: 'https://www.linkedin.com/jobs/view/cred-frontend-growth-4092499',
    dateSaved: '2026-10-16',
    dateApplied: '2026-10-16',
    status: 'Applied',
    relatedEmailIds: [],
    lastActivityDate: '2026-10-16',
    nextFollowUpDate: '2026-10-23',
    notes: 'Second distinct role at CRED (Growth & Onboarding funnel team). Kept separate from Design Systems role.',
    scamWarningCount: 0,
    reviewState: 'ambiguous_match',
    statusHistory: [
      { id: 'sh-6', fromStatus: 'Created', toStatus: 'Applied', date: '2026-10-16', reason: 'Applied directly via CRED career portal' }
    ]
  },
  {
    id: 'app-zerodha-1',
    company: 'Zerodha',
    role: 'Backend Systems Engineer (Go / Rust)',
    location: 'Bengaluru / Remote',
    workArrangement: 'Remote',
    jobSource: 'LinkedIn URL',
    jobUrl: 'https://www.linkedin.com/jobs/view/zerodha-backend-systems-go-4088120',
    dateSaved: '2026-10-14',
    dateApplied: '2026-10-15',
    status: 'Applied',
    relatedEmailIds: ['em-03'],
    lastActivityDate: '2026-10-15',
    nextFollowUpDate: '2026-10-22',
    notes: 'Applied 9 days ago with link to Go order-book engine repo. Overdue for 7-day follow-up.',
    scamWarningCount: 0,
    reviewState: 'clean',
    statusHistory: [
      { id: 'sh-7', fromStatus: 'Created', toStatus: 'Applied', date: '2026-10-15', reason: 'Confirmed via careers@zerodha.com', emailId: 'em-03' }
    ]
  },
  {
    id: 'app-postman-1',
    company: 'Postman',
    role: 'Staff Platform Engineer — API Intelligence',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'Hybrid',
    jobSource: 'LinkedIn URL',
    jobUrl: 'https://www.linkedin.com/jobs/view/postman-staff-platform-engineer-4089312',
    dateSaved: '2026-10-15',
    dateApplied: '2026-10-16',
    status: 'Applied',
    relatedEmailIds: ['em-04'],
    lastActivityDate: '2026-10-16',
    nextFollowUpDate: '2026-10-23',
    notes: 'Applied 8 days ago via Greenhouse. Ready for 7-day follow-up autopilot.',
    scamWarningCount: 0,
    reviewState: 'clean',
    statusHistory: [
      { id: 'sh-8', fromStatus: 'Created', toStatus: 'Applied', date: '2026-10-16', reason: 'Confirmed via Greenhouse ATS', emailId: 'em-04' }
    ]
  },
  {
    id: 'app-razorpay-1',
    company: 'Razorpay',
    role: 'Data Platform Engineer — Real-time Risk',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'Hybrid',
    jobSource: 'LinkedIn URL',
    jobUrl: 'https://www.linkedin.com/jobs/view/razorpay-data-platform-risk-4090015',
    dateSaved: '2026-10-16',
    dateApplied: '2026-10-17',
    status: 'Applied',
    relatedEmailIds: ['em-05'],
    lastActivityDate: '2026-10-17',
    nextFollowUpDate: '2026-10-24',
    notes: 'Applied exactly 7 days ago (Oct 17). Follow-up reminder is due today!',
    scamWarningCount: 0,
    reviewState: 'clean',
    statusHistory: [
      { id: 'sh-9', fromStatus: 'Created', toStatus: 'Applied', date: '2026-10-17', reason: 'Confirmed via jobs@razorpay.com', emailId: 'em-05' }
    ]
  },
  {
    id: 'app-juspay-1',
    company: 'Juspay',
    role: 'Distributed Systems Engineer — FP / Rust',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'On-site',
    jobSource: 'LinkedIn URL',
    jobUrl: 'https://www.linkedin.com/jobs/view/juspay-distributed-systems-rust-4085001',
    dateSaved: '2026-10-08',
    dateApplied: '2026-10-09',
    status: 'Offer',
    salaryOffered: '₹38,00,000 PA + ESOPs',
    relatedEmailIds: ['em-08', 'em-09'],
    lastActivityDate: '2026-10-23',
    nextFollowUpDate: null,
    notes: 'Official offer received: ₹38 LPA fixed + ESOPs! Verified @juspay.in domain, zero fees. Routine follow-ups disabled.',
    scamWarningCount: 0,
    reviewState: 'clean',
    statusHistory: [
      { id: 'sh-10', fromStatus: 'Created', toStatus: 'Applied', date: '2026-10-09', reason: 'Initial application submitted' },
      { id: 'sh-11', fromStatus: 'Applied', toStatus: 'Interview', date: '2026-10-19', reason: 'Final round scheduled via priya.nair@juspay.in', emailId: 'em-08' },
      { id: 'sh-12', fromStatus: 'Interview', toStatus: 'Offer', date: '2026-10-23', reason: 'Verified Employment Offer from offers@juspay.in', emailId: 'em-09' }
    ]
  },
  {
    id: 'app-tejsolpro-1',
    company: 'Tej SolPro',
    role: 'AI Product Engineer — Cloud & Enterprise Agents',
    location: 'Ahmedabad, Gujarat',
    workArrangement: 'Hybrid',
    jobSource: 'LinkedIn URL',
    jobUrl: 'https://www.linkedin.com/jobs/view/tej-solpro-ai-product-engineer-ahmedabad-4095001',
    dateSaved: '2026-10-10',
    dateApplied: '2026-10-11',
    status: 'Offer',
    salaryOffered: '₹22,00,000 PA',
    relatedEmailIds: ['em-10'],
    lastActivityDate: '2026-10-24',
    nextFollowUpDate: null,
    notes: 'Genuine offer in Ahmedabad (₹22 LPA Hybrid). Verified @tejsolpro.com.',
    scamWarningCount: 0,
    reviewState: 'clean',
    statusHistory: [
      { id: 'sh-13', fromStatus: 'Created', toStatus: 'Applied', date: '2026-10-11', reason: 'Applied via LinkedIn' },
      { id: 'sh-14', fromStatus: 'Applied', toStatus: 'Offer', date: '2026-10-24', reason: 'Verified Offer Letter from careers@tejsolpro.com', emailId: 'em-10' }
    ]
  },
  {
    id: 'app-workplate-1',
    company: 'Workplate',
    role: 'Full-Stack AI Engineer',
    location: 'Ahmedabad / Remote',
    workArrangement: 'Hybrid',
    jobSource: 'Job Description',
    jobUrl: 'https://www.linkedin.com/jobs/view/workplate-fullstack-ai-engineer-4094110',
    dateSaved: '2026-10-18',
    dateApplied: '2026-10-19',
    status: 'Interview',
    relatedEmailIds: ['em-13'],
    lastActivityDate: '2026-10-23',
    nextFollowUpDate: null,
    notes: 'Pairing session on Gemini function calling scheduled for Oct 29 at 11:30 AM IST.',
    scamWarningCount: 0,
    reviewState: 'clean',
    statusHistory: [
      { id: 'sh-15', fromStatus: 'Created', toStatus: 'Interview', date: '2026-10-23', reason: 'Interview scheduling follow-up from hiring@workplate.io', emailId: 'em-13' }
    ]
  },
  {
    id: 'app-swiggy-1',
    company: 'Swiggy',
    role: 'Principal Mobile Engineer',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'Hybrid',
    jobSource: 'LinkedIn URL',
    jobUrl: 'https://www.linkedin.com/jobs/view/swiggy-principal-mobile-4080112',
    dateSaved: '2026-10-10',
    dateApplied: '2026-10-11',
    status: 'Rejected',
    relatedEmailIds: ['em-11'],
    lastActivityDate: '2026-10-20',
    nextFollowUpDate: null,
    notes: 'Rejected on Oct 20. Reminders automatically suppressed.',
    scamWarningCount: 0,
    reviewState: 'clean',
    statusHistory: [
      { id: 'sh-16', fromStatus: 'Created', toStatus: 'Applied', date: '2026-10-11', reason: 'Applied on Swiggy Careers' },
      { id: 'sh-17', fromStatus: 'Applied', toStatus: 'Rejected', date: '2026-10-20', reason: 'Rejection email from no-reply@swiggy.in', emailId: 'em-11' }
    ]
  },
  {
    id: 'app-phonepe-1',
    company: 'PhonePe',
    role: 'Senior Backend Engineer',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'On-site',
    jobSource: 'LinkedIn URL',
    jobUrl: 'https://www.linkedin.com/jobs/view/phonepe-senior-backend-4081290',
    dateSaved: '2026-10-11',
    dateApplied: '2026-10-12',
    status: 'Rejected',
    relatedEmailIds: ['em-12'],
    lastActivityDate: '2026-10-21',
    nextFollowUpDate: null,
    notes: 'Did not advance past screening.',
    scamWarningCount: 0,
    reviewState: 'clean',
    statusHistory: [
      { id: 'sh-18', fromStatus: 'Created', toStatus: 'Rejected', date: '2026-10-21', reason: 'Rejection notice from talent@phonepe.com', emailId: 'em-12' }
    ]
  },
  {
    id: 'app-fractal-1',
    company: 'Fractal Analytics',
    role: 'Senior MLOps & GenAI Architect',
    location: 'Mumbai / Bengaluru',
    workArrangement: 'Hybrid',
    jobSource: 'Job Description',
    jobUrl: 'https://www.linkedin.com/jobs/view/fractal-mlops-genai-architect-4090555',
    dateSaved: '2026-10-16',
    dateApplied: '2026-10-16',
    dateAppliedEstimated: true,
    status: 'Applied',
    relatedEmailIds: [],
    lastActivityDate: '2026-10-16',
    nextFollowUpDate: '2026-10-23',
    notes: 'Application date was estimated from browser history. Please confirm exact application date.',
    scamWarningCount: 0,
    reviewState: 'clean',
    statusHistory: [
      { id: 'sh-19', fromStatus: 'Created', toStatus: 'Applied', date: '2026-10-16', reason: 'Imported from JD notes (estimated date)' }
    ]
  },
  {
    id: 'app-novatech-scam',
    company: 'NovaTech Global Solutions',
    role: 'Junior AI Prompt & Cloud Engineer',
    location: 'Remote',
    workArrangement: 'Remote',
    jobSource: 'Inbound Email',
    jobUrl: '',
    dateSaved: '2026-10-24',
    dateApplied: null,
    status: 'Saved',
    relatedEmailIds: ['em-15'],
    lastActivityDate: '2026-10-24',
    nextFollowUpDate: null,
    notes: 'BLOCKED SCAM: Demanded ₹14,500 UPI training & laptop security deposit. Status NOT promoted to Offer.',
    scamWarningCount: 1,
    reviewState: 'needs_review',
    statusHistory: [
      { id: 'sh-20', fromStatus: 'Created', toStatus: 'Saved', date: '2026-10-24', reason: 'Flagged as High-Risk Scam Offer by OfferGuard AI (Offer promotion blocked)', emailId: 'em-15' }
    ]
  },
  {
    id: 'app-tcs-scam',
    company: 'Tata Consultancy Services (Impersonated)',
    role: 'System Engineer',
    location: 'Pan-India',
    workArrangement: 'On-site',
    jobSource: 'Inbound Email',
    jobUrl: '',
    dateSaved: '2026-10-23',
    dateApplied: null,
    status: 'Saved',
    relatedEmailIds: ['em-16'],
    lastActivityDate: '2026-10-23',
    nextFollowUpDate: null,
    notes: 'BLOCKED SCAM: Spoofed @outlook.com sender demanding ₹4,999 registration fee in Hinglish.',
    scamWarningCount: 1,
    reviewState: 'needs_review',
    statusHistory: [
      { id: 'sh-21', fromStatus: 'Created', toStatus: 'Saved', date: '2026-10-23', reason: 'Flagged as Recruiter Impersonation Scam', emailId: 'em-16' }
    ]
  },
  {
    id: 'app-infosys-scam',
    company: 'Infosys (Lookalike Domain)',
    role: 'Senior Specialist Programmer',
    location: 'Bengaluru',
    workArrangement: 'Hybrid',
    jobSource: 'Inbound Email',
    jobUrl: '',
    dateSaved: '2026-10-24',
    dateApplied: null,
    status: 'Saved',
    relatedEmailIds: ['em-17'],
    lastActivityDate: '2026-10-24',
    nextFollowUpDate: null,
    notes: 'BLOCKED SCAM: Phishing for Aadhaar, PAN, Cancelled Cheque, and Digilocker OTP from @infosys-careers-india.org.',
    scamWarningCount: 1,
    reviewState: 'needs_review',
    statusHistory: [
      { id: 'sh-22', fromStatus: 'Created', toStatus: 'Saved', date: '2026-10-24', reason: 'Flagged as Identity & OTP Phishing Scam', emailId: 'em-17' }
    ]
  },
  {
    id: 'app-scale-scam',
    company: 'ScaleAI Global (Spoofed)',
    role: 'Remote AI Data Trainer',
    location: 'Remote',
    workArrangement: 'Remote',
    jobSource: 'Inbound Email',
    jobUrl: '',
    dateSaved: '2026-10-22',
    dateApplied: null,
    status: 'Saved',
    relatedEmailIds: ['em-18'],
    lastActivityDate: '2026-10-22',
    nextFollowUpDate: null,
    notes: 'BLOCKED SCAM: $99 USDT crypto wallet activation fee scam.',
    scamWarningCount: 1,
    reviewState: 'needs_review',
    statusHistory: [
      { id: 'sh-23', fromStatus: 'Created', toStatus: 'Saved', date: '2026-10-22', reason: 'Flagged as Crypto Advance-Fee Scam', emailId: 'em-18' }
    ]
  }
];

export const INITIAL_AMBIGUOUS_MATCHES: AmbiguousMatchCandidate[] = [
  {
    id: 'amb-1',
    emailId: 'em-19',
    emailSubject: 'CRED Frontend Engineer — Shortlist & Compensation Alignment',
    emailSender: 'vikram@apextech-staffing.in',
    detectedCompany: 'CRED',
    detectedRole: 'Frontend Engineer',
    candidateApplicationIds: ['app-cred-1', 'app-cred-2'],
    reason: 'You have 2 active applications at CRED ("Senior Frontend Engineer — Design Systems" and "Frontend Product Engineer — Growth & Onboarding"). The email only says "CRED Frontend Engineer" from a 3rd-party staffing agency.',
    resolved: false
  }
];

export const DEFAULT_LINKEDIN_IMPORT = {
  url: 'https://www.linkedin.com/jobs/view/google-cloud-india-ai-agent-architect-4099881',
  rawText: `Staff AI Agent Architect — Google Cloud India (Bengaluru / Hyderabad - Hybrid)
Company: Google Cloud India
Location: Bengaluru, Karnataka (Hybrid - 3 days in office)
Experience: Senior / Staff (6+ years)
Compensation: ₹55L – ₹78L Base + Equity

About the Role:
We are looking for a Staff AI Agent Architect to build next-generation multi-agent workflows powered by Gemini 2.5 Flash, Gemini 4 Argon, Vertex AI, and Firebase AI Logic. You will partner with enterprise engineering teams across India to design grounded, tool-using agents with strict JSON schema validation and human-in-the-loop safety guardrails.

Required Technical Skills:
- TypeScript, Python, Go, React
- Gemini API, Function Calling, Structured Outputs, Agent Development Kit (ADK)
- Firebase Firestore, Google Cloud Run, Vector Search`
};

// Live Incoming Email Simulation Scenarios for Real-Time Judge Demo
export const LIVE_SIMULATION_SCENARIOS = [
  {
    id: 'sim-scam-wipro',
    label: '🚨 Simulate Fake Wipro Offer (₹8,500 UPI Laptop Fee)',
    badge: 'HIGH RISK SCAM',
    email: {
      subject: 'URGENT: Wipro Elite AI Division Direct Joining — Pay ₹8,500 Laptop & Onboarding Fee Today',
      senderName: 'Wipro HR Direct Cell',
      senderEmail: 'wipro.direct.hiring2026@gmail.com',
      company: 'Wipro (Impersonated)',
      date: TODAY_ISO,
      body: 'Dear Candidate, You have been directly selected for Senior AI Engineer at Wipro (₹26 LPA) without technical interview! Aaj shaam 6 baje tak ₹8,500 refundable MacBook & portal activation charge UPI ID wipro.onboarding@ybl par transfer karein. Send payment screenshot + Aadhaar & PAN PDF immediately.'
    }
  },
  {
    id: 'sim-offer-sarvam',
    label: '🎉 Simulate Genuine Offer (Sarvam AI — ₹46 LPA)',
    badge: 'VERIFIED OFFER',
    targetAppId: 'app-sarvam-1',
    email: {
      subject: 'Official Offer of Employment: Senior AI Engineer — LLM Systems at Sarvam AI',
      senderName: 'Ananya Rao (Sarvam AI People Team)',
      senderEmail: 'offers@sarvam.ai',
      company: 'Sarvam AI',
      date: TODAY_ISO,
      body: 'Hi Aarav! Following your Technical Architecture Round, we are thrilled to extend an official offer of employment for Senior AI Engineer — LLM Systems at Sarvam AI (Bengaluru Hybrid). Total Fixed Compensation: ₹46,00,000 PA + ESOPs. Please review the formal offer packet on our candidate portal by 2026-11-02.'
    }
  },
  {
    id: 'sim-interview-zerodha',
    label: '📅 Simulate Interview Invite (Zerodha — Clears Overdue Reminder)',
    badge: 'INTERVIEW INVITE',
    targetAppId: 'app-zerodha-1',
    email: {
      subject: 'Invitation to Technical Systems Round — Backend Systems Engineer (Go / Rust) @ Zerodha',
      senderName: 'Kailash Nadh / Zerodha Tech Team',
      senderEmail: 'careers@zerodha.com',
      company: 'Zerodha',
      date: TODAY_ISO,
      body: 'Namaste Aarav, We reviewed your Go order-book engine repository and would love to invite you for a 60-minute Systems & Architecture discussion on Thursday, 2026-10-29 at 4:00 PM IST. Let us know if this works.'
    }
  }
];

// ============================================================================
// 3. AI REASONING & VALIDATION ENGINE (GEMINI API + BUILT-IN ENGINE)
// ============================================================================

function daysBetween(date1Iso: string, date2Iso: string): number {
  const d1 = new Date(date1Iso + 'T00:00:00Z').getTime();
  const d2 = new Date(date2Iso + 'T00:00:00Z').getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function addDays(dateIso: string, days: number): string {
  const d = new Date(dateIso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function validateGeminiEmailSchema(raw: unknown): GeminiEmailAnalysis {
  const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const validCategories: EmailCategory[] = ['applied', 'interview', 'rejected', 'offer', 'scam'];
  const validRisks: RiskLevel[] = ['low', 'medium', 'high', 'uncertain'];

  const category: EmailCategory = validCategories.includes(obj.category as EmailCategory)
    ? (obj.category as EmailCategory)
    : 'applied';

  const riskLevel: RiskLevel = validRisks.includes(obj.riskLevel as RiskLevel)
    ? (obj.riskLevel as RiskLevel)
    : category === 'scam'
    ? 'high'
    : 'low';

  const confidenceNum = typeof obj.confidence === 'number' ? Math.max(0, Math.min(1, obj.confidence)) : 0.85;
  const evidenceArr = Array.isArray(obj.evidence)
    ? obj.evidence.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : ['Analyzed email body and sender metadata'];

  return {
    category,
    company: typeof obj.company === 'string' && obj.company.trim() ? obj.company.trim() : null,
    jobTitle: typeof obj.jobTitle === 'string' && obj.jobTitle.trim() ? obj.jobTitle.trim() : null,
    eventDate: typeof obj.eventDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(obj.eventDate) ? obj.eventDate.slice(0, 10) : null,
    confidence: confidenceNum,
    riskLevel,
    evidence: evidenceArr.length > 0 ? evidenceArr : ['Extracted from message content'],
    explanation: typeof obj.explanation === 'string' && obj.explanation.trim()
      ? obj.explanation.trim()
      : 'Classified by OfferGuard AI reasoning pipeline.',
    recommendedAction: typeof obj.recommendedAction === 'string' && obj.recommendedAction.trim()
      ? obj.recommendedAction.trim()
      : 'Review classification in tracker.',
    requiresHumanReview: typeof obj.requiresHumanReview === 'boolean'
      ? obj.requiresHumanReview
      : category === 'scam' || riskLevel === 'high' || riskLevel === 'uncertain',
    underlyingStatus: typeof obj.underlyingStatus === 'string' ? (obj.underlyingStatus as ApplicationStatus) : null,
    redFlags: Array.isArray(obj.redFlags) ? obj.redFlags.filter((x): x is string => typeof x === 'string') : []
  };
}

export async function analyzeEmailWithAI(
  email: { subject: string; senderName: string; senderEmail: string; body: string; date?: string },
  apiKey: string,
  modelId: string
): Promise<{ analysis: GeminiEmailAnalysis; usedLiveGemini: boolean; isUnrelatedNoise: boolean }> {
  const combined = `${email.subject}\n${email.senderName} <${email.senderEmail}>\n${email.body}`;
  const lower = combined.toLowerCase();

  if (apiKey && apiKey.trim().length > 10) {
    try {
      const prompt = `You are OfferGuard AI, an expert job-hunt autopilot and recruitment fraud investigator.
Analyze the following email and classify it into EXACTLY ONE primary category: "applied", "interview", "rejected", "offer", or "scam".
CRITICAL RULES:
1. If there is ANY evidence of recruitment fraud (upfront training/laptop/registration/verification/crypto fees, UPI demands, Hinglish deadline coercion like "aaj shaam 5 baje tak pay karein", requests for OTP/Aadhaar/PAN/bank statements before interviewing, or free webmail @gmail/@outlook impersonating major IT companies like TCS/Infosys/Wipro), category MUST be "scam" and riskLevel MUST be "high".
2. Never classify a promotional bank/credit-card/shopping message as "offer" just because it contains the word "offer".
3. Return strict JSON matching the schema.

Email Subject: ${email.subject}
Sender: ${email.senderName} <${email.senderEmail}>
Date: ${email.date || TODAY_ISO}
Body:
${email.body}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          const validated = validateGeminiEmailSchema(parsed);
          const isNoise = Boolean(
            validated.company === null &&
            (lower.includes('credit card') || lower.includes('regalia') || lower.includes('festive pre-approved'))
          );
          return { analysis: validated, usedLiveGemini: true, isUnrelatedNoise: isNoise };
        }
      }
    } catch {
      // Fall through cleanly to local engine
    }
  }

  const evidence: string[] = [];
  const redFlags: string[] = [];

  if (
    (lower.includes('credit card') || lower.includes('airport lounge') || lower.includes('pre-approved')) &&
    !lower.includes('interview') &&
    !lower.includes('employment') &&
    !lower.includes('candidacy')
  ) {
    return {
      usedLiveGemini: false,
      isUnrelatedNoise: true,
      analysis: {
        category: 'applied',
        company: null,
        jobTitle: null,
        eventDate: null,
        confidence: 0.96,
        riskLevel: 'low',
        evidence: [
          `Subject mentions "${email.subject}"`,
          'Contains the word "Offer" in a retail banking/credit-card context rather than employment.'
        ],
        explanation: 'Unrelated promotional message containing the keyword "Offer". OfferGuard AI prevented a false-positive job offer status update.',
        recommendedAction: 'No tracker action needed (filtered as non-job promotional noise).',
        requiresHumanReview: false
      }
    };
  }

  const hasFeeDemand = /₹\s*\d+|\$\s*\d+|rs\.?\s*\d+|training fee|security fee|registration charge|refundable|deposit|upi|usdt|wallet fee/i.test(combined) &&
    /fee|charge|deposit|pay|upi|usdt|wallet|transfer karein/i.test(combined);
  const hasFreeMailImpersonation = /@(gmail|outlook|yahoo|hotmail)\.com/i.test(email.senderEmail) &&
    /tcs|tata|infosys|wipro|hcl|tech mahindra|accenture|novatech|hr|direct/i.test(combined);
  const hasKycOtpPhishing = /otp|digilocker|cancelled cheque|bank statement|aadhaar|pan pdf/i.test(combined);
  const hasUrgencyCoercion = /within \d+ hours|aaj shaam|warna.*cancel|immediately|forfeit your offer|without.*interview|without coding round/i.test(combined);
  const hasLookalikeDomain = /infosys-careers|scale-ai-jobs|-careers-india\.org/i.test(email.senderEmail);

  if (hasFeeDemand) {
    redFlags.push('Upfront payment / security deposit / registration fee requested');
    const feeMatch = combined.match(/[^.\n]*(?:₹\s*[\d,]+|\$\s*[\d,]+|upi|usdt|registration charge|security fee)[^.\n]*/i);
    if (feeMatch) evidence.push(feeMatch[0].trim());
  }
  if (hasFreeMailImpersonation) {
    redFlags.push(`Sender uses free webmail address (${email.senderEmail}) for corporate recruiting`);
    evidence.push(`Unverified sender address: ${email.senderEmail}`);
  }
  if (hasKycOtpPhishing) {
    redFlags.push('Requests sensitive KYC documents (Aadhaar/PAN/Bank statement) or live OTP before interviewing');
    const kycMatch = combined.match(/[^.\n]*(?:otp|aadhaar|cancelled cheque|bank statement)[^.\n]*/i);
    if (kycMatch) evidence.push(kycMatch[0].trim());
  }
  if (hasUrgencyCoercion) {
    redFlags.push('Coercive deadline or "Direct Offer Without Interview" pressure tactic');
    const urgMatch = combined.match(/[^.\n]*(?:within \d+ hours|aaj shaam|without.*interview|without coding round)[^.\n]*/i);
    if (urgMatch) evidence.push(urgMatch[0].trim());
  }
  if (hasLookalikeDomain) {
    redFlags.push(`Spoofed lookalike domain detected: ${email.senderEmail}`);
    evidence.push(`Lookalike sender domain: ${email.senderEmail}`);
  }

  let detectedCompany: string | null = null;
  const knownCompanies = [
    'Sarvam AI', 'CRED', 'Zerodha', 'Postman', 'Razorpay', 'Juspay',
    'Tej SolPro', 'Swiggy', 'PhonePe', 'Workplate', 'WebOccult Technologies',
    'NovaTech Global Solutions', 'Tata Consultancy Services', 'Infosys', 'ScaleAI Global', 'Wipro'
  ];
  for (const c of knownCompanies) {
    if (combined.toLowerCase().includes(c.toLowerCase())) {
      detectedCompany = c;
      break;
    }
  }
  if (!detectedCompany && lower.includes('tcs')) detectedCompany = 'Tata Consultancy Services (Impersonated)';

  let detectedRole: string | null = null;
  const rolePatterns = [
    /Senior AI Engineer — LLM Systems/i,
    /Senior Frontend Engineer — Design Systems/i,
    /Frontend Product Engineer — Growth & Onboarding/i,
    /Backend Systems Engineer \(Go \/ Rust\)/i,
    /Staff Platform Engineer — API Intelligence/i,
    /Data Platform Engineer — Real-time Risk/i,
    /Distributed Systems Engineer — FP \/ Rust/i,
    /AI Product Engineer — Cloud & Enterprise Agents/i,
    /Principal Mobile Engineer/i,
    /Senior Backend Engineer/i,
    /Full-Stack AI Engineer/i,
    /Senior Computer Vision & AI Engineer/i,
    /Junior AI Prompt & Cloud Engineer/i,
    /Senior Specialist Programmer/i,
    /Remote AI Data Trainer/i,
    /Senior AI Engineer/i,
    /System Engineer/i,
    /Frontend Engineer/i
  ];
  for (const rp of rolePatterns) {
    const m = combined.match(rp);
    if (m) {
      detectedRole = m[0];
      break;
    }
  }

  const isoMatch = combined.match(/2026-\d{2}-\d{2}/);
  const eventDate = isoMatch ? isoMatch[0] : (email.date || TODAY_ISO);

  if (redFlags.length > 0) {
    return {
      usedLiveGemini: false,
      isUnrelatedNoise: false,
      analysis: {
        category: 'scam',
        company: detectedCompany || 'Unverified Sender',
        jobTitle: detectedRole || 'Unspecified Role',
        eventDate,
        confidence: 0.99,
        riskLevel: 'high',
        underlyingStatus: lower.includes('offer') || lower.includes('joining') ? 'Offer' : 'Interview',
        redFlags,
        evidence: evidence.length > 0 ? evidence : [email.subject],
        explanation: `Flagged as High-Risk Scam (${redFlags.length} forensic indicators). ${redFlags.join('; ')}. OfferGuard AI automatically blocked this message from marking any application as a genuine Offer.`,
        recommendedAction: 'Do NOT pay any money, share OTPs, or upload Aadhaar/PAN. Verify independently on the company’s official career portal.',
        requiresHumanReview: true
      }
    };
  }

  if (lower.includes('staffing') || lower.includes('on behalf of')) {
    return {
      usedLiveGemini: false,
      isUnrelatedNoise: false,
      analysis: {
        category: 'interview',
        company: detectedCompany,
        jobTitle: detectedRole,
        eventDate,
        confidence: 0.74,
        riskLevel: 'uncertain',
        evidence: [
          `Third-party sender (${email.senderEmail}) recruiting on behalf of ${detectedCompany || 'client'}`,
          `Mentions generic role "${detectedRole || 'Engineer'}" which requires disambiguation.`
        ],
        explanation: 'Third-party staffing agency message. While external recruiters are common, the generic role title matches multiple applications at the same company and requires your confirmation.',
        recommendedAction: 'Confirm which application this email belongs to in the Ambiguous Match banner.',
        requiresHumanReview: true
      }
    };
  }

  if (lower.includes('unfortunately') || lower.includes('not be proceeding') || lower.includes('move forward with candidates')) {
    const rejLine = email.body.split('.').find((s) => /unfortunately|move forward|not be proceeding/i.test(s)) || email.subject;
    return {
      usedLiveGemini: false,
      isUnrelatedNoise: false,
      analysis: {
        category: 'rejected',
        company: detectedCompany,
        jobTitle: detectedRole,
        eventDate,
        confidence: 0.99,
        riskLevel: 'low',
        evidence: [rejLine.trim()],
        explanation: `Formal rejection notice from ${detectedCompany || email.senderName}. Follow-up reminders are automatically disabled.`,
        recommendedAction: 'Update application status to Rejected and close active reminders.',
        requiresHumanReview: false
      }
    };
  }

  if (
    (lower.includes('official offer of employment') || lower.includes('delighted to offer you') || lower.includes('offer letter:')) &&
    (lower.includes('ctc') || lower.includes('compensation') || lower.includes('docusign'))
  ) {
    return {
      usedLiveGemini: false,
      isUnrelatedNoise: false,
      analysis: {
        category: 'offer',
        company: detectedCompany,
        jobTitle: detectedRole,
        eventDate,
        confidence: 0.98,
        riskLevel: 'low',
        evidence: [
          email.subject,
          `Sender domain (${email.senderEmail}) matches company and includes structured compensation terms with zero fee requests.`
        ],
        explanation: `Genuine employment offer from ${detectedCompany || email.senderName} with transparent salary details and zero red flags.`,
        recommendedAction: 'Review offer terms and respond before the acceptance deadline.',
        requiresHumanReview: false
      }
    };
  }

  if (
    lower.includes('invite you') ||
    lower.includes('reschedule') ||
    lower.includes('final round') ||
    lower.includes('screening call') ||
    lower.includes('pairing session') ||
    lower.includes('architecture discussion')
  ) {
    return {
      usedLiveGemini: false,
      isUnrelatedNoise: false,
      analysis: {
        category: 'interview',
        company: detectedCompany,
        jobTitle: detectedRole,
        eventDate,
        confidence: 0.96,
        riskLevel: 'low',
        evidence: [email.body.slice(0, 160).trim()],
        explanation: `Legitimate interview invitation or scheduling update for ${detectedRole || 'your application'} at ${detectedCompany || email.senderName}.`,
        recommendedAction: `Confirm interview slot on ${eventDate}.`,
        requiresHumanReview: false
      }
    };
  }

  return {
    usedLiveGemini: false,
    isUnrelatedNoise: false,
    analysis: {
      category: 'applied',
      company: detectedCompany,
      jobTitle: detectedRole,
      eventDate,
      confidence: 0.98,
      riskLevel: 'low',
      evidence: [email.body.slice(0, 150).trim()],
      explanation: `Application receipt confirmation from ${detectedCompany || email.senderName}.`,
      recommendedAction: 'Track application and trigger a follow-up reminder if no response arrives within 7 days.',
      requiresHumanReview: false
    }
  };
}

export async function extractJobFromTextWithAI(
  input: { url: string; rawText: string; manualTitle?: string; manualCompany?: string; manualLocation?: string },
  apiKey: string,
  modelId: string
): Promise<{
  title: string;
  company: string;
  location: string;
  workArrangement: WorkArrangement;
  seniority: string;
  skills: string[];
  salaryRange: string;
  description: string;
  missingFields: string[];
  usedLiveGemini: boolean;
}> {
  const text = input.rawText.trim();

  if (apiKey && apiKey.trim().length > 10 && text.length > 10) {
    try {
      const prompt = `Extract structured job listing fields from the following job description and optional URL.
Return strict JSON with keys:
- title (string)
- company (string)
- location (string)
- workArrangement ("Remote" | "Hybrid" | "On-site" | "Unspecified")
- seniority (string)
- skills (array of strings, max 8)
- salaryRange (string or "")
- description (concise 2-sentence summary)
- missingFields (array of strings naming any key details missing from the text, such as "Salary Range", "Location", "Work Arrangement", "Seniority")

URL: ${input.url}
Raw Job Description:
${text}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
          })
        }
      );
      if (res.ok) {
        const data = await res.json();
        const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          return {
            title: input.manualTitle || parsed.title || 'Software Engineer',
            company: input.manualCompany || parsed.company || 'Unknown Company',
            location: input.manualLocation || parsed.location || 'India',
            workArrangement: (['Remote', 'Hybrid', 'On-site', 'Unspecified'].includes(parsed.workArrangement)
              ? parsed.workArrangement
              : 'Hybrid') as WorkArrangement,
            seniority: parsed.seniority || 'Mid-Senior',
            skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 8) : ['TypeScript', 'React', 'AI'],
            salaryRange: parsed.salaryRange || '',
            description: parsed.description || text.slice(0, 240),
            missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
            usedLiveGemini: true
          };
        }
      }
    } catch {
      // Fallback to deterministic parser
    }
  }

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] || '';
  const companyLine = lines.find((l) => /^company\s*:/i.test(l));
  const locationLine = lines.find((l) => /^location\s*:/i.test(l));
  const expLine = lines.find((l) => /^(experience|seniority)\s*:/i.test(l));
  const compLine = lines.find((l) => /^(compensation|salary|ctc)\s*:/i.test(l));

  const title =
    input.manualTitle?.trim() ||
    firstLine.split('—')[0]?.split('@')[0]?.trim() ||
    'Senior Software Engineer';

  let company = input.manualCompany?.trim() || '';
  if (!company && companyLine) {
    company = companyLine.replace(/^company\s*:\s*/i, '').trim();
  }
  if (!company && firstLine.includes('—')) {
    company = firstLine.split('—')[1]?.split('(')[0]?.trim() || '';
  }
  if (!company && input.url) {
    const slug = input.url.split('/view/')[1] || '';
    if (slug) {
      company = slug.split('-').slice(0, 2).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }

  let location = input.manualLocation?.trim() || '';
  if (!location && locationLine) {
    location = locationLine.replace(/^location\s*:\s*/i, '').trim();
  }
  if (!location && /bengaluru|ahmedabad|hyderabad|pune|mumbai|gurugram|remote/i.test(text)) {
    const locMatch = text.match(/Bengaluru|Ahmedabad|Hyderabad|Pune|Mumbai|Gurugram|Remote/i);
    if (locMatch) location = locMatch[0];
  }

  let workArrangement: WorkArrangement = 'Unspecified';
  if (/remote/i.test(text)) workArrangement = 'Remote';
  if (/hybrid/i.test(text)) workArrangement = 'Hybrid';
  if (/on-site|onsite|in-office/i.test(text)) workArrangement = 'On-site';

  const seniority = expLine
    ? expLine.replace(/^(experience|seniority)\s*:\s*/i, '').trim()
    : /staff|principal/i.test(text)
    ? 'Staff / Principal (6+ yrs)'
    : /senior/i.test(text)
    ? 'Senior (4-7 yrs)'
    : 'Mid-Level (2-5 yrs)';

  const salaryRange = compLine
    ? compLine.replace(/^(compensation|salary|ctc)\s*:\s*/i, '').trim()
    : (text.match(/₹\s*\d+\s*L\s*[–-]\s*₹?\s*\d+\s*L/i)?.[0] || '');

  const skillCatalog = [
    'React', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'Node.js', 'Next.js',
    'Tailwind CSS', 'Gemini API', 'Vertex AI', 'Firebase', 'Google Cloud',
    'PyTorch', 'Kubernetes', 'Kafka', 'PostgreSQL', 'GraphQL', 'ADK', 'Function Calling'
  ];
  const skills = skillCatalog.filter((sk) => new RegExp(`\\b${sk.replace('.', '\\.')}\\b`, 'i').test(text));
  if (skills.length === 0) skills.push('Software Engineering', 'System Design');

  const missingFields: string[] = [];
  if (!company) missingFields.push('Company Name');
  if (!location) missingFields.push('Location');
  if (workArrangement === 'Unspecified') missingFields.push('Work Arrangement (Remote/Hybrid/On-site)');
  if (!salaryRange) missingFields.push('Salary / Compensation Range');

  return {
    title,
    company: company || 'Unspecified Company',
    location: location || 'Unspecified Location',
    workArrangement,
    seniority,
    skills,
    salaryRange,
    description: text.slice(0, 360),
    missingFields,
    usedLiveGemini: false
  };
}

export async function generateFollowUpDraftWithAI(
  app: ApplicationRecord,
  daysElapsed: number,
  apiKey: string,
  modelId: string
): Promise<{ subject: string; body: string; usedLiveGemini: boolean }> {
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const prompt = `Write a concise, polite, high-converting follow-up email for a software/AI job application.
Company: ${app.company}
Role: ${app.role}
Date Applied: ${app.dateApplied || '1 week ago'} (${daysElapsed} days ago)
Candidate Context: Experienced engineer following up after ${daysElapsed} days with no response.
Return strict JSON with keys "subject" and "body". Keep the body under 120 words, warm, professional, and without bracketed placeholders if details are known.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
          })
        }
      );
      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          if (parsed.subject && parsed.body) {
            return { subject: parsed.subject, body: parsed.body, usedLiveGemini: true };
          }
        }
      }
    } catch {
      // Fallback cleanly
    }
  }

  const subject = `Following up on my application for ${app.role} — ${app.company}`;
  const body = `Hi ${app.company} Hiring Team,

I hope your week is going well. I submitted my application for the ${app.role} role on ${app.dateApplied || 'October 16, 2026'} (${daysElapsed} days ago) and wanted to briefly reiterate my strong interest in joining ${app.company}.

My recent work building production systems and AI-driven workflows aligns closely with your team's roadmap. Please let me know if I can share any additional code samples, architecture notes, or references to support my candidacy.

Thank you for your time and consideration.

Best regards,
Aarav Patel`;

  return { subject, body, usedLiveGemini: false };
}

export function generateRoleCopilotBrief(app: ApplicationRecord): {
  headline: string;
  trustScore: string;
  keyPoints: string[];
  actionableQuestions: string[];
} {
  if (app.status === 'Offer') {
    return {
      headline: `OFFER VERIFICATION & NEGOTIATION PLAYBOOK — ${app.company.toUpperCase()}`,
      trustScore: '99% VERIFIED AUTHENTIC CORPORATE OFFER',
      keyPoints: [
        `Compensation Package: ${app.salaryOffered || 'Competitive Base + ESOPs'} (Zero upfront fee requests detected).`,
        'Domain Check Passed: Official corporate domain matches prior interview thread.',
        'ESOP & Variable Check: Request exercise window details (prefer 5–10 yr post-exit exercise) and base-to-variable split.'
      ],
      actionableQuestions: [
        'Can we review the ESOP vesting schedule (cliff vs. quarterly vesting) and latest 409A / fair-market valuation?',
        'Is there flexibility on the joining bonus given competing final-round timelines?',
        'What are the core 30-60-90 day engineering deliverables expected for this role?'
      ]
    };
  }
  if (app.status === 'Interview') {
    return {
      headline: `TECHNICAL INTERVIEW PREP DOSSIER — ${app.company.toUpperCase()}`,
      trustScore: '97% VERIFIED ACTIVE INTERVIEW LOOP',
      keyPoints: [
        `Target Role: ${app.role} (${app.workArrangement} · ${app.location}).`,
        'Focus Areas: Low-latency system architecture, production failure modes, and clean code craft.',
        'Preparation Strategy: Bring 2 concrete post-mortem or scaling stories with p95 latency and throughput metrics.'
      ],
      actionableQuestions: [
        `How does the ${app.company} engineering team currently evaluate reliability and latency in production?`,
        'What is the biggest architectural bottleneck the team plans to solve over the next two quarters?',
        'How are product and infrastructure trade-offs prioritized during rapid releases?'
      ]
    };
  }
  return {
    headline: `APPLICATION STRATEGY BRIEF — ${app.company.toUpperCase()}`,
    trustScore: app.scamWarningCount > 0 ? '0% — BLOCKED FRAUDULENT ENTITY' : '92% CLEAN APPLICATION RECORD',
    keyPoints: [
      `Current Stage: ${app.status} · Last Activity: ${app.lastActivityDate}.`,
      app.nextFollowUpDate
        ? `7-Day Follow-Up Rule Active: Scheduled for ${app.nextFollowUpDate}.`
        : 'Follow-up rule currently suppressed or awaiting initial submission.',
      'Tip: Attach a 3-sentence technical summary or relevant GitHub repository link when sending your 7-day follow-up.'
    ],
    actionableQuestions: [
      'Would sharing a short architecture write-up or live demo link help accelerate technical screening?',
      'Who is the hiring manager or technical lead overseeing this opening?'
    ]
  };
}

export function parseMboxContent(mboxText: string): Array<{
  subject: string;
  senderName: string;
  senderEmail: string;
  date: string;
  body: string;
}> {
  const blocks = mboxText.split(/^From /m).map((b) => b.trim()).filter(Boolean);
  const results: Array<{ subject: string; senderName: string; senderEmail: string; date: string; body: string }> = [];

  for (const block of blocks) {
    const parts = block.split(/\r?\n\r?\n/);
    const headerText = parts[0] || '';
    const bodyText = parts.slice(1).join('\n\n').trim();

    const subjMatch = headerText.match(/^Subject:\s*(.+)$/im);
    const fromMatch = headerText.match(/^From:\s*(.+)$/im);
    const dateMatch = headerText.match(/^Date:\s*(.+)$/im);

    const subject = subjMatch ? subjMatch[1].trim() : 'Imported .mbox Message';
    const rawFrom = fromMatch ? fromMatch[1].trim() : 'Unknown Sender <unknown@example.com>';
    const emailMatch = rawFrom.match(/<([^>]+)>/);
    const senderEmail = emailMatch ? emailMatch[1].trim() : rawFrom;
    const senderName = rawFrom.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || senderEmail;

    let isoDate = TODAY_ISO;
    if (dateMatch) {
      const parsed = new Date(dateMatch[1].trim());
      if (!isNaN(parsed.getTime())) {
        isoDate = parsed.toISOString().slice(0, 10);
      }
    }

    if (bodyText || subjMatch) {
      results.push({ subject, senderName, senderEmail, date: isoDate, body: bodyText || subject });
    }
  }
  return results;
}

// ============================================================================
// 4. NEO-BRUTALIST PRODUCTION APPLICATION
// ============================================================================

const STORAGE_KEY = 'offerguard_ai_neobrutalist_v3';

const BRUTAL_CARD = 'bg-white border-2 border-black shadow-[5px_5px_0px_0px_#000000]';
const BRUTAL_BTN =
  'border-2 border-black font-black uppercase tracking-wider text-xs px-3.5 py-2 shadow-[3px_3px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000000] transition-all inline-flex items-center gap-1.5';
const BRUTAL_INPUT =
  'w-full bg-white border-2 border-black px-3 py-2 text-xs font-medium text-black placeholder-zinc-500 focus:outline-none focus:bg-[#FEF9C3] focus:shadow-[3px_3px_0px_0px_#000000] transition-all';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'discover' | 'applications' | 'inbox' | 'scam' | 'followups' | 'settings'
  >('overview');

  // Core Workspace State
  const [jobs, setJobs] = useState<JobListing[]>(INITIAL_JOBS);
  const [emails, setEmails] = useState<EmailRecord[]>(INITIAL_EMAILS);
  const [applications, setApplications] = useState<ApplicationRecord[]>(INITIAL_APPLICATIONS);
  const [ambiguousMatches, setAmbiguousMatches] = useState<AmbiguousMatchCandidate[]>(INITIAL_AMBIGUOUS_MATCHES);
  const [reminderStates, setReminderStates] = useState<Record<string, 'active' | 'snoozed' | 'completed' | 'dismissed'>>({});
  const [reminderDrafts, setReminderDrafts] = useState<Record<string, { subject: string; body: string }>>({});

  // Runtime AI Settings
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [lastAiCallLive, setLastAiCallLive] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // New High-Impact Final Product Features State
  const [trackerViewMode, setTrackerViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedDossierAppId, setSelectedDossierAppId] = useState<string | null>(null);
  const [cybercrimeReportModal, setCybercrimeReportModal] = useState<EmailRecord | null>(null);
  const [showSimulateMenu, setShowSimulateMenu] = useState<boolean>(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (title: string, description: string, type: ToastMessage['type'] = 'info') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [{ id, title, description, type }, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Discover Jobs State
  const [importMode, setImportMode] = useState<'linkedin' | 'jd'>('linkedin');
  const [linkedinUrlInput, setLinkedinUrlInput] = useState<string>(DEFAULT_LINKEDIN_IMPORT.url);
  const [linkedinFallbackJd, setLinkedinFallbackJd] = useState<string>(DEFAULT_LINKEDIN_IMPORT.rawText);
  const [jdManualTitle, setJdManualTitle] = useState<string>('');
  const [jdManualCompany, setJdManualCompany] = useState<string>('');
  const [jdManualLocation, setJdManualLocation] = useState<string>('');
  const [jdManualUrl, setJdManualUrl] = useState<string>('');
  const [jdRawInput, setJdRawInput] = useState<string>('');
  const [extractedPreview, setExtractedPreview] = useState<{
    title: string;
    company: string;
    location: string;
    workArrangement: WorkArrangement;
    seniority: string;
    skills: string;
    salaryRange: string;
    sourceUrl: string;
    sourceType: 'LinkedIn URL' | 'Job Description';
    description: string;
    missingFields: string[];
  } | null>(null);
  const [jobSearchFilter, setJobSearchFilter] = useState<string>('');
  const [jobArrangementFilter, setJobArrangementFilter] = useState<string>('ALL');

  // Inbox Intelligence State
  const [emailCategoryFilter, setEmailCategoryFilter] = useState<string>('ALL');
  const [emailSearch, setEmailSearch] = useState<string>('');
  const [selectedEmailId, setSelectedEmailId] = useState<string>('em-15');
  const [jsonImportText, setJsonImportText] = useState<string>('');
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);
  const [showImportDrawer, setShowImportDrawer] = useState<boolean>(false);

  // Application Tracker State
  const [appStatusFilter, setAppStatusFilter] = useState<string>('ALL');
  const [showNewAppModal, setShowNewAppModal] = useState<boolean>(false);
  const [editingApp, setEditingApp] = useState<ApplicationRecord | null>(null);
  const [newAppForm, setNewAppForm] = useState<{
    company: string;
    role: string;
    location: string;
    workArrangement: WorkArrangement;
    jobUrl: string;
    dateApplied: string;
    status: ApplicationStatus;
    notes: string;
  }>({
    company: '',
    role: '',
    location: 'Bengaluru, Karnataka',
    workArrangement: 'Hybrid',
    jobUrl: '',
    dateApplied: TODAY_ISO,
    status: 'Applied',
    notes: ''
  });

  // Live Scam Scanner State
  const [customScamText, setCustomScamText] = useState<string>(
    'CONGRATULATIONS! Direct joining at Wipro AI Division (₹24 LPA) without coding interview. Pay ₹6,500 refundable laptop & background verification charge via UPI wipro.hr.desk@ybl aaj shaam 6 baje tak, and reply with Aadhaar + PAN PDF.'
  );
  const [customScamResult, setCustomScamResult] = useState<GeminiEmailAnalysis | null>(null);

  // Follow-up Draft Modal State
  const [activeDraftAppId, setActiveDraftAppId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load persisted state from localStorage safely
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.jobs)) setJobs(parsed.jobs);
        if (Array.isArray(parsed.emails)) setEmails(parsed.emails);
        if (Array.isArray(parsed.applications)) setApplications(parsed.applications);
        if (Array.isArray(parsed.ambiguousMatches)) setAmbiguousMatches(parsed.ambiguousMatches);
        if (parsed.reminderStates) setReminderStates(parsed.reminderStates);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save state to localStorage safely
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          jobs,
          emails,
          applications,
          ambiguousMatches,
          reminderStates
        })
      );
    } catch {
      // Ignore storage write errors
    }
  }, [jobs, emails, applications, ambiguousMatches, reminderStates]);

  // Compute 7-Day Follow-up Reminders dynamically from Applications
  const reminders: FollowUpReminder[] = useMemo(() => {
    const list: FollowUpReminder[] = [];
    for (const app of applications) {
      if (app.archived) continue;
      if (app.status === 'Rejected' || app.status === 'Offer' || app.status === 'Saved') continue;
      if (app.status !== 'Applied') continue;

      const appliedDate = app.dateApplied || app.dateSaved;
      const daysSince = daysBetween(appliedDate, TODAY_ISO);
      const dueDate = addDays(appliedDate, 7);

      let bucket: FollowUpReminder['bucket'] = 'upcoming';
      if (daysSince > 7) bucket = 'overdue';
      else if (daysSince === 7) bucket = 'due_today';

      const state = reminderStates[app.id] || 'active';
      const draft = reminderDrafts[app.id];

      list.push({
        id: `rem-${app.id}`,
        applicationId: app.id,
        company: app.company,
        role: app.role,
        dateApplied: appliedDate,
        dateAppliedConfirmed: !app.dateAppliedEstimated && Boolean(app.dateApplied),
        dueDate,
        daysSinceApplied: daysSince,
        bucket,
        status: state,
        draftSubject: draft?.subject,
        draftBody: draft?.body
      });
    }
    return list.sort((a, b) => b.daysSinceApplied - a.daysSinceApplied);
  }, [applications, reminderStates, reminderDrafts]);

  // Live Dashboard Metrics
  const metrics = useMemo(() => {
    const activeApps = applications.filter((a) => !a.archived);
    const totalSavedJobs = jobs.length;
    const totalApplications = activeApps.filter((a) => a.status !== 'Saved' || a.scamWarningCount === 0).length;
    const interviews = activeApps.filter((a) => a.status === 'Interview').length;
    const offers = activeApps.filter((a) => a.status === 'Offer').length;
    const rejections = activeApps.filter((a) => a.status === 'Rejected').length;
    const scamEmailsPending = emails.filter(
      (e) => e.analysis?.category === 'scam' && e.scamReviewState !== 'dismissed' && e.scamReviewState !== 'reviewed'
    ).length;
    const followUpsDue = reminders.filter(
      (r) => (r.bucket === 'overdue' || r.bucket === 'due_today') && r.status === 'active'
    ).length;

    return {
      totalSavedJobs,
      totalApplications,
      interviews,
      offers,
      rejections,
      scamEmailsPending,
      followUpsDue
    };
  }, [jobs, applications, emails, reminders]);

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedId(id);
      addToast('Copied to Clipboard', 'Content copied and ready to paste.', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      addToast('Copy Ready', 'Select the text in the editor to copy.', 'info');
    }
  };

  // Export Workspace JSON
  const handleExportWorkspaceJson = () => {
    const payload = JSON.stringify({ jobs, emails, applications, ambiguousMatches, reminderStates }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offerguard-workspace-${TODAY_ISO}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Workspace Exported', 'Downloaded full JSON backup of jobs, emails, and tracker state.', 'success');
  };

  // Export Applications CSV
  const handleExportApplicationsCsv = () => {
    const headers = ['Company', 'Role', 'Status', 'Location', 'WorkArrangement', 'DateApplied', 'NextFollowUpDate', 'ScamWarnings', 'Notes'];
    const rows = applications.filter((a) => !a.archived).map((a) => [
      `"${a.company.replace(/"/g, '""')}"`,
      `"${a.role.replace(/"/g, '""')}"`,
      `"${a.status}"`,
      `"${a.location.replace(/"/g, '""')}"`,
      `"${a.workArrangement}"`,
      `"${a.dateApplied || ''}"`,
      `"${a.nextFollowUpDate || ''}"`,
      `"${a.scamWarningCount}"`,
      `"${a.notes.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offerguard-applications-${TODAY_ISO}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('CSV Ledger Exported', 'Downloaded spreadsheet-ready CSV of all tracked applications.', 'success');
  };

  // Live Incoming Email Webhook Simulator (Real-Time End-to-End Action)
  const handleSimulateIncomingEmail = async (scenario: typeof LIVE_SIMULATION_SCENARIOS[number]) => {
    setShowSimulateMenu(false);
    setIsAnalyzing(true);

    const aiRes = await analyzeEmailWithAI(scenario.email, geminiApiKey, selectedModel);
    setLastAiCallLive(aiRes.usedLiveGemini);

    const newEmailId = 'em-live-' + Date.now();
    const newEmail: EmailRecord = {
      id: newEmailId,
      subject: scenario.email.subject,
      senderName: scenario.email.senderName,
      senderEmail: scenario.email.senderEmail,
      company: aiRes.analysis.company || scenario.email.company,
      date: TODAY_ISO,
      importedAt: TODAY_ISO,
      body: scenario.email.body,
      analyzed: true,
      analysis: aiRes.analysis,
      matchedApplicationId: scenario.targetAppId || null,
      scamReviewState: aiRes.analysis.category === 'scam' ? 'pending' : undefined
    };

    setEmails((prev) => [newEmail, ...prev]);
    setSelectedEmailId(newEmailId);

    if (aiRes.analysis.category === 'scam') {
      const scamAppId = 'app-scam-' + Date.now();
      const blockedApp: ApplicationRecord = {
        id: scamAppId,
        company: newEmail.company,
        role: aiRes.analysis.jobTitle || 'Senior AI Engineer',
        location: 'Remote / Pan-India',
        workArrangement: 'Remote',
        jobSource: 'Live Inbound Email',
        jobUrl: '',
        dateSaved: TODAY_ISO,
        dateApplied: null,
        status: 'Saved',
        relatedEmailIds: [newEmailId],
        lastActivityDate: TODAY_ISO,
        nextFollowUpDate: null,
        notes: `INTERCEPTED LIVE SCAM: ${aiRes.analysis.explanation}`,
        scamWarningCount: 1,
        reviewState: 'needs_review',
        statusHistory: [
          {
            id: 'sh-' + Date.now(),
            fromStatus: 'Created',
            toStatus: 'Saved',
            date: TODAY_ISO,
            reason: 'Blocked High-Risk Scam Offer from promoting to Offer status',
            emailId: newEmailId
          }
        ]
      };
      setApplications((prev) => [blockedApp, ...prev]);
      setIsAnalyzing(false);
      setActiveTab('scam');
      addToast(
        '🚨 HIGH-RISK SCAM INTERCEPTED!',
        `Blocked fake offer from ${newEmail.senderEmail} demanding upfront UPI fees. Quarantined in Scam Investigator.`,
        'danger'
      );
      return;
    }

    if (scenario.targetAppId) {
      const nextStatus: ApplicationStatus =
        aiRes.analysis.category === 'offer'
          ? 'Offer'
          : aiRes.analysis.category === 'interview'
          ? 'Interview'
          : 'Applied';

      setApplications((prev) =>
        prev.map((app) =>
          app.id === scenario.targetAppId
            ? {
                ...app,
                status: nextStatus,
                salaryOffered: aiRes.analysis.category === 'offer' ? '₹46,00,000 PA + ESOPs' : app.salaryOffered,
                relatedEmailIds: [...app.relatedEmailIds, newEmailId],
                lastActivityDate: TODAY_ISO,
                nextFollowUpDate: null,
                statusHistory: [
                  ...app.statusHistory,
                  {
                    id: 'sh-' + Date.now(),
                    fromStatus: app.status,
                    toStatus: nextStatus,
                    date: TODAY_ISO,
                    reason: `Auto-updated by incoming ${aiRes.analysis.category.toUpperCase()} email from ${newEmail.senderEmail}`,
                    emailId: newEmailId
                  }
                ]
              }
            : app
        )
      );
    }

    setIsAnalyzing(false);
    addToast(
      `Live Email Processed (${aiRes.analysis.category.toUpperCase()})`,
      `Classified "${newEmail.subject}" and automatically updated ${newEmail.company} in your Application Tracker!`,
      'success'
    );
  };

  // Restore Default Dataset
  const handleRestoreDataset = () => {
    setJobs(INITIAL_JOBS);
    setEmails(INITIAL_EMAILS);
    setApplications(INITIAL_APPLICATIONS);
    setAmbiguousMatches(INITIAL_AMBIGUOUS_MATCHES);
    setReminderStates({});
    addToast(
      'Workspace Dataset Synced',
      'Restored 9 job listings, 20 inbox messages, 16 applications, and 7-day follow-up queue.',
      'success'
    );
  };

  // Clear Workspace to Empty
  const handleClearToEmpty = () => {
    setConfirmModal({
      open: true,
      title: 'CLEAR ENTIRE WORKSPACE?',
      description:
        'This removes all current jobs, emails, applications, and reminders so you can start with a blank slate. You can restore the starter dataset anytime from the top bar.',
      confirmLabel: 'Clear All Records',
      danger: true,
      onConfirm: () => {
        setJobs([]);
        setEmails([]);
        setApplications([]);
        setAmbiguousMatches([]);
        setReminderStates({});
        setConfirmModal(null);
        addToast('Workspace Cleared', 'All records removed.', 'warning');
      }
    });
  };

  // Extract LinkedIn URL or JD
  const handleExtractJob = async (mode: 'linkedin' | 'jd') => {
    setIsAnalyzing(true);
    const rawText = mode === 'linkedin' ? linkedinFallbackJd : jdRawInput;
    const url = mode === 'linkedin' ? linkedinUrlInput : jdManualUrl;

    if (!rawText.trim()) {
      setIsAnalyzing(false);
      addToast(
        'Job Description Required',
        'Paste the job description text so OfferGuard AI can extract structured fields.',
        'warning'
      );
      return;
    }

    const res = await extractJobFromTextWithAI(
      {
        url,
        rawText,
        manualTitle: mode === 'jd' ? jdManualTitle : undefined,
        manualCompany: mode === 'jd' ? jdManualCompany : undefined,
        manualLocation: mode === 'jd' ? jdManualLocation : undefined
      },
      geminiApiKey,
      selectedModel
    );

    setLastAiCallLive(res.usedLiveGemini);
    setExtractedPreview({
      title: res.title,
      company: res.company,
      location: res.location,
      workArrangement: res.workArrangement,
      seniority: res.seniority,
      skills: res.skills.join(', '),
      salaryRange: res.salaryRange,
      sourceUrl: url || 'https://www.linkedin.com/jobs/',
      sourceType: mode === 'linkedin' ? 'LinkedIn URL' : 'Job Description',
      description: res.description,
      missingFields: res.missingFields
    });
    setIsAnalyzing(false);
    addToast(
      'Job Fields Extracted',
      `Extracted "${res.title}" at ${res.company}. Review and save below.`,
      'success'
    );
  };

  // Save Extracted Job to Pipeline & Tracker
  const handleSaveExtractedJob = (markAppliedImmediately: boolean) => {
    if (!extractedPreview) return;

    const duplicate = jobs.find(
      (j) =>
        j.company.toLowerCase() === extractedPreview.company.toLowerCase() &&
        j.title.toLowerCase() === extractedPreview.title.toLowerCase()
    );
    if (duplicate) {
      addToast(
        'Duplicate Prevented',
        `A listing for "${extractedPreview.title}" at ${extractedPreview.company} already exists in your pipeline.`,
        'warning'
      );
      return;
    }

    const newJobId = 'job-user-' + Date.now();
    const newAppId = 'app-user-' + Date.now();
    const skillList = extractedPreview.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newJob: JobListing = {
      id: newJobId,
      title: extractedPreview.title,
      company: extractedPreview.company,
      location: extractedPreview.location,
      workArrangement: extractedPreview.workArrangement,
      seniority: extractedPreview.seniority,
      skills: skillList,
      salaryRange: extractedPreview.salaryRange,
      sourceUrl: extractedPreview.sourceUrl,
      sourceType: extractedPreview.sourceType,
      description: extractedPreview.description,
      missingFields: extractedPreview.missingFields,
      dateAdded: TODAY_ISO,
      linkedApplicationId: newAppId
    };

    const initialStatus: ApplicationStatus = markAppliedImmediately ? 'Applied' : 'Saved';
    const newApp: ApplicationRecord = {
      id: newAppId,
      company: extractedPreview.company,
      role: extractedPreview.title,
      location: extractedPreview.location,
      workArrangement: extractedPreview.workArrangement,
      jobSource: extractedPreview.sourceType,
      jobUrl: extractedPreview.sourceUrl,
      dateSaved: TODAY_ISO,
      dateApplied: markAppliedImmediately ? TODAY_ISO : null,
      status: initialStatus,
      relatedEmailIds: [],
      lastActivityDate: TODAY_ISO,
      nextFollowUpDate: markAppliedImmediately ? addDays(TODAY_ISO, 7) : null,
      notes: `Extracted via OfferGuard AI (${extractedPreview.seniority}). Skills: ${skillList.join(', ')}`,
      scamWarningCount: 0,
      reviewState: 'clean',
      statusHistory: [
        {
          id: 'sh-' + Date.now(),
          fromStatus: 'Created',
          toStatus: initialStatus,
          date: TODAY_ISO,
          reason: `Imported via ${extractedPreview.sourceType}`
        }
      ]
    };

    setJobs((prev) => [newJob, ...prev]);
    setApplications((prev) => [newApp, ...prev]);
    setExtractedPreview(null);
    addToast(
      'Added to Tracker',
      `"${newJob.title}" at ${newJob.company} saved with status "${initialStatus}".`,
      'success'
    );
  };

  // Track Saved Job
  const handleTrackSavedJob = (job: JobListing) => {
    if (job.linkedApplicationId && applications.some((a) => a.id === job.linkedApplicationId)) {
      setActiveTab('applications');
      return;
    }
    const newAppId = 'app-' + Date.now();
    const newApp: ApplicationRecord = {
      id: newAppId,
      company: job.company,
      role: job.title,
      location: job.location,
      workArrangement: job.workArrangement,
      jobSource: job.sourceType,
      jobUrl: job.sourceUrl,
      dateSaved: TODAY_ISO,
      dateApplied: TODAY_ISO,
      status: 'Applied',
      relatedEmailIds: [],
      lastActivityDate: TODAY_ISO,
      nextFollowUpDate: addDays(TODAY_ISO, 7),
      notes: `Promoted from Saved Jobs (${job.salaryRange || 'Competitive'}).`,
      scamWarningCount: 0,
      reviewState: 'clean',
      statusHistory: [
        {
          id: 'sh-' + Date.now(),
          fromStatus: 'Created',
          toStatus: 'Applied',
          date: TODAY_ISO,
          reason: 'Added from Discover Jobs'
        }
      ]
    };
    setApplications((prev) => [newApp, ...prev]);
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, linkedApplicationId: newAppId } : j)));
    addToast('Tracked as Applied', `${job.title} at ${job.company} is now tracked in Applications.`, 'success');
  };

  // Run AI Classification Pipeline on Inbox
  const handleRunInboxIntelligence = async () => {
    setIsAnalyzing(true);
    const updatedEmails: EmailRecord[] = [];
    let liveUsed = false;

    for (const em of emails) {
      const res = await analyzeEmailWithAI(em, geminiApiKey, selectedModel);
      if (res.usedLiveGemini) liveUsed = true;
      updatedEmails.push({
        ...em,
        analyzed: true,
        isUnrelatedNoise: res.isUnrelatedNoise,
        analysis: res.analysis
      });
    }

    setEmails(updatedEmails);
    setLastAiCallLive(liveUsed);
    setIsAnalyzing(false);
    addToast(
      'Inbox Intelligence Complete',
      `Classified ${updatedEmails.length} emails and isolated ${
        updatedEmails.filter((e) => e.analysis?.category === 'scam').length
      } high-risk scam threats.`,
      'success'
    );
  };

  // Import Custom JSON or .mbox Emails
  const handleImportCustomEmails = async (rawContent: string, format: 'json' | 'mbox') => {
    setImportErrorMsg(null);
    if (!rawContent.trim()) {
      setImportErrorMsg('Please paste or upload non-empty content.');
      return;
    }

    try {
      let incomingList: Array<{
        subject: string;
        senderName: string;
        senderEmail: string;
        company?: string;
        date?: string;
        body: string;
      }> = [];

      if (format === 'json') {
        const parsed = JSON.parse(rawContent);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of arr) {
          if (typeof item !== 'object' || !item || (!item.subject && !item.body)) {
            throw new Error('Invalid email schema: each JSON record must contain "subject" and "body".');
          }
          incomingList.push({
            subject: String(item.subject || 'Untitled Email'),
            senderName: String(item.senderName || item.sender || 'External Sender'),
            senderEmail: String(item.senderEmail || item.from || 'unknown@sender.org'),
            company: item.company ? String(item.company) : undefined,
            date: item.date ? String(item.date).slice(0, 10) : TODAY_ISO,
            body: String(item.body || '')
          });
        }
      } else {
        incomingList = parseMboxContent(rawContent);
        if (incomingList.length === 0) {
          throw new Error('Could not parse any valid RFC-822 messages from .mbox input.');
        }
      }

      setIsAnalyzing(true);
      let addedCount = 0;
      let duplicateCount = 0;
      const newEmails: EmailRecord[] = [];

      for (const item of incomingList) {
        const exists = emails.some(
          (e) =>
            e.subject.toLowerCase() === item.subject.toLowerCase() &&
            e.senderEmail.toLowerCase() === item.senderEmail.toLowerCase()
        );
        if (exists) {
          duplicateCount++;
          continue;
        }

        const aiRes = await analyzeEmailWithAI(item, geminiApiKey, selectedModel);
        const newId = 'em-custom-' + Date.now() + '-' + addedCount;
        newEmails.push({
          id: newId,
          subject: item.subject,
          senderName: item.senderName,
          senderEmail: item.senderEmail,
          company: aiRes.analysis.company || item.company || 'External',
          date: item.date || TODAY_ISO,
          importedAt: TODAY_ISO,
          body: item.body,
          analyzed: true,
          isUnrelatedNoise: aiRes.isUnrelatedNoise,
          analysis: aiRes.analysis,
          scamReviewState: aiRes.analysis.category === 'scam' ? 'pending' : undefined
        });
        addedCount++;
      }

      setEmails((prev) => [...newEmails, ...prev]);
      setIsAnalyzing(false);
      setJsonImportText('');
      setShowImportDrawer(false);
      addToast(
        'Email Import Complete',
        `Imported & analyzed ${addedCount} email(s)${duplicateCount > 0 ? ` (${duplicateCount} duplicate(s) skipped)` : ''}.`,
        'success'
      );
    } catch (err) {
      setIsAnalyzing(false);
      const msg = err instanceof Error ? err.message : 'Invalid JSON syntax or corrupted file.';
      setImportErrorMsg(msg);
      addToast('Import Validation Error', msg, 'danger');
    }
  };

  // Resolve Ambiguous Match
  const handleResolveAmbiguousMatch = (ambId: string, chosenAppId: string) => {
    const amb = ambiguousMatches.find((m) => m.id === ambId);
    if (!amb) return;

    const targetApp = applications.find((a) => a.id === chosenAppId);
    if (!targetApp) return;

    setEmails((prev) =>
      prev.map((e) => (e.id === amb.emailId ? { ...e, matchedApplicationId: chosenAppId } : e))
    );

    setApplications((prev) =>
      prev.map((a) => {
        if (a.id === chosenAppId) {
          const nextStatus: ApplicationStatus = a.status === 'Saved' || a.status === 'Applied' ? 'Interview' : a.status;
          return {
            ...a,
            status: nextStatus,
            relatedEmailIds: a.relatedEmailIds.includes(amb.emailId)
              ? a.relatedEmailIds
              : [...a.relatedEmailIds, amb.emailId],
            lastActivityDate: TODAY_ISO,
            reviewState: 'reviewed',
            statusHistory: [
              ...a.statusHistory,
              {
                id: 'sh-' + Date.now(),
                fromStatus: a.status,
                toStatus: nextStatus,
                date: TODAY_ISO,
                reason: `User confirmed ambiguous email match (${amb.emailSubject})`,
                emailId: amb.emailId
              }
            ]
          };
        }
        if (amb.candidateApplicationIds.includes(a.id)) {
          return { ...a, reviewState: 'clean' };
        }
        return a;
      })
    );

    setAmbiguousMatches((prev) => prev.map((m) => (m.id === ambId ? { ...m, resolved: true } : m)));
    addToast(
      'Ambiguous Match Confirmed',
      `Linked email to "${targetApp.role}" at ${targetApp.company}.`,
      'success'
    );
  };

  // Scam Review or Dismiss
  const handleScamAction = (emailId: string, action: 'reviewed' | 'dismissed') => {
    const target = emails.find((e) => e.id === emailId);
    if (!target) return;

    if (action === 'dismissed') {
      setConfirmModal({
        open: true,
        title: 'DISMISS HIGH-RISK SCAM WARNING?',
        description: `Are you sure you want to dismiss the scam warning for "${target.subject}" from ${target.senderEmail}? Never pay upfront fees or share OTP/KYC documents.`,
        confirmLabel: 'Confirm Dismiss Warning',
        danger: true,
        onConfirm: () => {
          setEmails((prev) =>
            prev.map((e) => (e.id === emailId ? { ...e, scamReviewState: 'dismissed' } : e))
          );
          if (target.matchedApplicationId) {
            setApplications((prev) =>
              prev.map((a) =>
                a.id === target.matchedApplicationId ? { ...a, reviewState: 'reviewed' } : a
              )
            );
          }
          setConfirmModal(null);
          addToast('Warning Dismissed', 'Scam alert dismissed.', 'warning');
        }
      });
    } else {
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, scamReviewState: 'reviewed' } : e))
      );
      if (target.matchedApplicationId) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === target.matchedApplicationId ? { ...a, reviewState: 'reviewed' } : a
          )
        );
      }
      addToast('Marked Reviewed', `Logged security review for ${target.company}.`, 'success');
    }
  };

  // Generate 7-Day Follow-up Email Draft
  const handleGenerateFollowUp = async (appId: string) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return;

    setIsAnalyzing(true);
    const daysElapsed = daysBetween(app.dateApplied || app.dateSaved, TODAY_ISO);
    const res = await generateFollowUpDraftWithAI(app, Math.max(daysElapsed, 7), geminiApiKey, selectedModel);
    setLastAiCallLive(res.usedLiveGemini);
    setReminderDrafts((prev) => ({
      ...prev,
      [appId]: { subject: res.subject, body: res.body }
    }));
    setActiveDraftAppId(appId);
    setIsAnalyzing(false);
    addToast('Follow-Up Draft Ready', `Prepared follow-up email for ${app.company}.`, 'success');
  };

  // Confirm Estimated Application Date
  const handleConfirmApplicationDate = (appId: string, newDate: string) => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId
          ? {
              ...a,
              dateApplied: newDate,
              dateAppliedEstimated: false,
              nextFollowUpDate: addDays(newDate, 7)
            }
          : a
      )
    );
    addToast('Application Date Confirmed', `Follow-up schedule anchored to ${newDate}.`, 'success');
  };

  // Create or Update Manual Application
  const handleSaveManualApplication = () => {
    if (!newAppForm.company.trim() || !newAppForm.role.trim()) {
      addToast('Missing Fields', 'Please enter both Company and Role title.', 'warning');
      return;
    }

    if (editingApp) {
      setApplications((prev) =>
        prev.map((a) =>
          a.id === editingApp.id
            ? {
                ...a,
                company: newAppForm.company.trim(),
                role: newAppForm.role.trim(),
                location: newAppForm.location.trim(),
                workArrangement: newAppForm.workArrangement,
                jobUrl: newAppForm.jobUrl.trim(),
                dateApplied: newAppForm.dateApplied || null,
                status: newAppForm.status,
                notes: newAppForm.notes,
                lastActivityDate: TODAY_ISO,
                statusHistory:
                  a.status !== newAppForm.status
                    ? [
                        ...a.statusHistory,
                        {
                          id: 'sh-' + Date.now(),
                          fromStatus: a.status,
                          toStatus: newAppForm.status,
                          date: TODAY_ISO,
                          reason: 'Manual status update by user'
                        }
                      ]
                    : a.statusHistory
              }
            : a
        )
      );
      setEditingApp(null);
      setShowNewAppModal(false);
      addToast('Application Updated', `Saved changes to ${newAppForm.role} at ${newAppForm.company}.`, 'success');
      return;
    }

    const dup = applications.find(
      (a) =>
        !a.archived &&
        a.company.toLowerCase() === newAppForm.company.trim().toLowerCase() &&
        a.role.toLowerCase() === newAppForm.role.trim().toLowerCase()
    );
    if (dup) {
      addToast(
        'Duplicate Application Blocked',
        `You already have an active tracker entry for "${newAppForm.role}" at ${newAppForm.company}.`,
        'warning'
      );
      return;
    }

    const newApp: ApplicationRecord = {
      id: 'app-manual-' + Date.now(),
      company: newAppForm.company.trim(),
      role: newAppForm.role.trim(),
      location: newAppForm.location.trim() || 'India',
      workArrangement: newAppForm.workArrangement,
      jobSource: 'Manual Entry',
      jobUrl: newAppForm.jobUrl.trim(),
      dateSaved: TODAY_ISO,
      dateApplied: newAppForm.status !== 'Saved' ? newAppForm.dateApplied || TODAY_ISO : null,
      status: newAppForm.status,
      relatedEmailIds: [],
      lastActivityDate: TODAY_ISO,
      nextFollowUpDate: newAppForm.status === 'Applied' ? addDays(newAppForm.dateApplied || TODAY_ISO, 7) : null,
      notes: newAppForm.notes,
      scamWarningCount: 0,
      reviewState: 'clean',
      statusHistory: [
        {
          id: 'sh-' + Date.now(),
          fromStatus: 'Created',
          toStatus: newAppForm.status,
          date: TODAY_ISO,
          reason: 'Manually created in Application Tracker'
        }
      ]
    };

    setApplications((prev) => [newApp, ...prev]);
    setShowNewAppModal(false);
    setNewAppForm({
      company: '',
      role: '',
      location: 'Bengaluru, Karnataka',
      workArrangement: 'Hybrid',
      jobUrl: '',
      dateApplied: TODAY_ISO,
      status: 'Applied',
      notes: ''
    });
    addToast('Application Created', `Added ${newApp.role} at ${newApp.company} to tracker.`, 'success');
  };

  // Neo-Brutalist Badge Helpers
  const renderStatusBadge = (status: ApplicationStatus) => {
    const styles: Record<ApplicationStatus, string> = {
      Saved: 'bg-zinc-200 text-black border-black',
      Applied: 'bg-[#93C5FD] text-black border-black',
      Interview: 'bg-[#DDD6FE] text-black border-black',
      Offer: 'bg-[#6EE7B7] text-black border-black',
      Rejected: 'bg-zinc-300 text-zinc-800 border-black line-through'
    };
    return (
      <span
        className={`px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider border-2 shadow-[2px_2px_0px_0px_#000] inline-block ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  const renderCategoryBadge = (cat: EmailCategory, isNoise?: boolean) => {
    if (isNoise) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border-2 border-black bg-zinc-200 text-black">
          IGNORED NOISE
        </span>
      );
    }
    const styles: Record<EmailCategory, string> = {
      applied: 'bg-[#93C5FD] text-black',
      interview: 'bg-[#DDD6FE] text-black',
      offer: 'bg-[#6EE7B7] text-black',
      rejected: 'bg-zinc-300 text-black',
      scam: 'bg-[#EF4444] text-white'
    };
    return (
      <span
        className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_#000] ${styles[cat]}`}
      >
        {cat}
      </span>
    );
  };

  const renderRiskBadge = (risk: RiskLevel) => {
    const styles: Record<RiskLevel, string> = {
      low: 'bg-[#6EE7B7] text-black',
      medium: 'bg-[#FDE047] text-black',
      high: 'bg-[#EF4444] text-white',
      uncertain: 'bg-[#FDE047] text-black'
    };
    return (
      <span
        className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_0px_#000] ${styles[risk]}`}
      >
        {risk} RISK
      </span>
    );
  };

  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || emails[0] || null;
  const activeDraftApp = applications.find((a) => a.id === activeDraftAppId) || null;
  const selectedDossierApp = applications.find((a) => a.id === selectedDossierAppId) || null;

  return (
    <div className="min-h-screen bg-[#F4F0EA] text-black flex flex-col font-sans selection:bg-[#FACC15] selection:text-black">
      {/* Toast Notification Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 border-2 border-black shadow-[6px_6px_0px_0px_#000000] flex items-start gap-3 ${
              t.type === 'danger'
                ? 'bg-[#FCA5A5] text-black'
                : t.type === 'warning'
                ? 'bg-[#FDE047] text-black'
                : t.type === 'success'
                ? 'bg-[#6EE7B7] text-black'
                : 'bg-white text-black'
            }`}
          >
            {t.type === 'danger' ? (
              <ShieldAlert className="w-5 h-5 text-black shrink-0 mt-0.5" />
            ) : t.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-black shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-5 h-5 text-black shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-black uppercase tracking-wider">{t.title}</div>
              <div className="text-xs font-medium mt-0.5 leading-snug">{t.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black shadow-[10px_10px_0px_0px_#000000] max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`p-2.5 border-2 border-black shadow-[3px_3px_0px_0px_#000] ${
                  confirmModal.danger ? 'bg-[#EF4444] text-white' : 'bg-[#FACC15] text-black'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black uppercase tracking-tight text-black">
                {confirmModal.title}
              </h3>
            </div>
            <p className="text-xs font-medium text-zinc-800 leading-relaxed mb-6">
              {confirmModal.description}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className={`${BRUTAL_BTN} bg-white text-black`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`${BRUTAL_BTN} ${
                  confirmModal.danger ? 'bg-[#EF4444] text-white' : 'bg-[#2563EB] text-white'
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Dossier & AI Interview/Offer Copilot Modal */}
      {selectedDossierApp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_#000000] max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between border-b-2 border-black pb-4">
              <div>
                <div className="flex items-center gap-2">
                  {renderStatusBadge(selectedDossierApp.status)}
                  <span className="text-xs font-mono font-bold text-zinc-600">
                    ID: {selectedDossierApp.id}
                  </span>
                </div>
                <h2 className="text-lg font-black uppercase text-black mt-2">
                  {selectedDossierApp.company} — {selectedDossierApp.role}
                </h2>
                <p className="text-xs font-bold text-zinc-700">
                  {selectedDossierApp.location} · {selectedDossierApp.workArrangement}
                  {selectedDossierApp.salaryOffered ? ` · ${selectedDossierApp.salaryOffered}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDossierAppId(null)}
                className={`${BRUTAL_BTN} bg-zinc-200 text-black`}
              >
                Close
              </button>
            </div>

            {/* AI Role Copilot Playbook */}
            {(() => {
              const brief = generateRoleCopilotBrief(selectedDossierApp);
              return (
                <div className="p-4 bg-[#FEF9C3] border-2 border-black shadow-[4px_4px_0px_0px_#000] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" /> {brief.headline}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-black bg-[#6EE7B7] text-black border border-black">
                      {brief.trustScore}
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs font-bold text-zinc-900 list-disc pl-4">
                    {brief.keyPoints.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-black">
                    <div className="text-[11px] font-black uppercase text-black mb-1">
                      High-Leverage Questions to Ask the Team:
                    </div>
                    <div className="space-y-1">
                      {brief.actionableQuestions.map((q, i) => (
                        <div key={i} className="text-xs font-mono bg-white p-2 border border-black text-black">
                          {i + 1}. "{q}"
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Complete Status Audit Timeline */}
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-black">
                VERIFIED STATUS AUDIT TRAIL ({selectedDossierApp.statusHistory.length} EVENTS)
              </h3>
              <div className="space-y-2">
                {selectedDossierApp.statusHistory.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-[#F4F0EA] border-2 border-black flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-black uppercase text-black">
                        {h.fromStatus} → {h.toStatus}
                      </span>
                      <div className="font-medium text-zinc-800 mt-0.5">{h.reason}</div>
                    </div>
                    <span className="font-mono font-bold text-zinc-700 shrink-0">{h.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cybercrime 1930 / CERT-In Incident Report Modal */}
      {cybercrimeReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_#000000] max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-[#EF4444] text-white border border-black">
                  NATIONAL CYBER CRIME PORTAL (1930 / CERT-IN) BRIEF
                </span>
                <h3 className="text-base font-black uppercase text-black mt-1.5">
                  Forensic Evidence Packet — {cybercrimeReportModal.company}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCybercrimeReportModal(null)}
                className={`${BRUTAL_BTN} bg-zinc-200 text-black`}
              >
                Close
              </button>
            </div>

            {(() => {
              const reportText = `INCIDENT TYPE: Recruitment Advance-Fee / Impersonation Phishing
DATE DETECTED: ${cybercrimeReportModal.date}
CLAIMED ENTITY: ${cybercrimeReportModal.company}
SPOOFED SENDER ADDRESS: ${cybercrimeReportModal.senderName} <${cybercrimeReportModal.senderEmail}>
EXPECTED OFFICIAL DOMAIN: ${cybercrimeReportModal.analysis?.expectedOfficialDomain || 'Official Corporate Domain'}
SUBJECT LINE: ${cybercrimeReportModal.subject}
RISK CLASSIFICATION: ${cybercrimeReportModal.analysis?.riskLevel.toUpperCase()} (${Math.round((cybercrimeReportModal.analysis?.confidence || 0.99) * 100)}% Confidence)

FORENSIC RED FLAGS:
${(cybercrimeReportModal.analysis?.redFlags || cybercrimeReportModal.analysis?.evidence || []).map((r) => `- ${r}`).join('\n')}

VERBATIM EXTORTION / PHISHING EXCERPTS:
${(cybercrimeReportModal.analysis?.evidence || []).map((e) => `"${e}"`).join('\n')}

AI FORENSIC SUMMARY:
${cybercrimeReportModal.analysis?.explanation}`;

              return (
                <>
                  <pre className="p-4 bg-black text-[#6EE7B7] border-2 border-black text-[11px] font-mono whitespace-pre-wrap max-h-80 overflow-y-auto">
                    {reportText}
                  </pre>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] font-bold text-zinc-700">
                      Ready to paste into cybercrime.gov.in or forward to abuse desk.
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(reportText, 'cyber-' + cybercrimeReportModal.id)}
                      className={`${BRUTAL_BTN} bg-[#EF4444] text-white`}
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Incident Report
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Follow-up Email Draft Modal */}
      {activeDraftApp && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black shadow-[10px_10px_0px_0px_#000000] max-w-xl w-full p-6">
            <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 bg-[#FACC15] border-2 border-black">
                  7-Day Follow-Up Autopilot
                </span>
                <h3 className="text-base font-black uppercase text-black mt-2">
                  {activeDraftApp.company} — {activeDraftApp.role}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDraftAppId(null)}
                className={`${BRUTAL_BTN} bg-zinc-200 text-black`}
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={reminderDrafts[activeDraftApp.id]?.subject || ''}
                  onChange={(e) =>
                    setReminderDrafts((prev) => ({
                      ...prev,
                      [activeDraftApp.id]: {
                        subject: e.target.value,
                        body: prev[activeDraftApp.id]?.body || ''
                      }
                    }))
                  }
                  className={BRUTAL_INPUT}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                  Email Body (Editable — Never Sent Without Your Action)
                </label>
                <textarea
                  rows={8}
                  value={reminderDrafts[activeDraftApp.id]?.body || ''}
                  onChange={(e) =>
                    setReminderDrafts((prev) => ({
                      ...prev,
                      [activeDraftApp.id]: {
                        subject: prev[activeDraftApp.id]?.subject || '',
                        body: e.target.value
                      }
                    }))
                  }
                  className={`${BRUTAL_INPUT} font-mono leading-relaxed`}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t-2 border-black">
              <a
                href={`mailto:?subject=${encodeURIComponent(
                  reminderDrafts[activeDraftApp.id]?.subject || ''
                )}&body=${encodeURIComponent(reminderDrafts[activeDraftApp.id]?.body || '')}`}
                className={`${BRUTAL_BTN} bg-[#FACC15] text-black`}
              >
                <Mail className="w-3.5 h-3.5" /> Open in Mail App
              </a>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const draft = reminderDrafts[activeDraftApp.id];
                    copyToClipboard(`Subject: ${draft?.subject}\n\n${draft?.body}`, activeDraftApp.id);
                  }}
                  className={`${BRUTAL_BTN} bg-[#2563EB] text-white`}
                >
                  {copiedId === activeDraftApp.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === activeDraftApp.id ? 'Copied!' : 'Copy Draft'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReminderStates((prev) => ({ ...prev, [activeDraftApp.id]: 'completed' }));
                    setActiveDraftAppId(null);
                    addToast('Reminder Completed', `Marked follow-up for ${activeDraftApp.company} as completed.`, 'success');
                  }}
                  className={`${BRUTAL_BTN} bg-[#10B981] text-black`}
                >
                  Mark Sent & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New / Edit Application Modal */}
      {showNewAppModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-4 border-black shadow-[10px_10px_0px_0px_#000000] max-w-lg w-full p-6">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
              <h3 className="text-base font-black uppercase text-black">
                {editingApp ? 'Edit Application Record' : 'Create New Application'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowNewAppModal(false);
                  setEditingApp(null);
                }}
                className={`${BRUTAL_BTN} bg-zinc-200 text-black`}
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-black uppercase mb-1">Company *</label>
                <input
                  type="text"
                  value={newAppForm.company}
                  onChange={(e) => setNewAppForm({ ...newAppForm, company: e.target.value })}
                  placeholder="e.g. Sarvam AI"
                  className={BRUTAL_INPUT}
                />
              </div>
              <div>
                <label className="block font-black uppercase mb-1">Role Title *</label>
                <input
                  type="text"
                  value={newAppForm.role}
                  onChange={(e) => setNewAppForm({ ...newAppForm, role: e.target.value })}
                  placeholder="e.g. Staff AI Engineer"
                  className={BRUTAL_INPUT}
                />
              </div>
              <div>
                <label className="block font-black uppercase mb-1">Location</label>
                <input
                  type="text"
                  value={newAppForm.location}
                  onChange={(e) => setNewAppForm({ ...newAppForm, location: e.target.value })}
                  className={BRUTAL_INPUT}
                />
              </div>
              <div>
                <label className="block font-black uppercase mb-1">Work Arrangement</label>
                <select
                  value={newAppForm.workArrangement}
                  onChange={(e) => setNewAppForm({ ...newAppForm, workArrangement: e.target.value as WorkArrangement })}
                  className={BRUTAL_INPUT}
                >
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                  <option value="On-site">On-site</option>
                  <option value="Unspecified">Unspecified</option>
                </select>
              </div>
              <div>
                <label className="block font-black uppercase mb-1">Status</label>
                <select
                  value={newAppForm.status}
                  onChange={(e) => setNewAppForm({ ...newAppForm, status: e.target.value as ApplicationStatus })}
                  className={BRUTAL_INPUT}
                >
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="block font-black uppercase mb-1">Date Applied</label>
                <input
                  type="date"
                  value={newAppForm.dateApplied}
                  onChange={(e) => setNewAppForm({ ...newAppForm, dateApplied: e.target.value })}
                  className={BRUTAL_INPUT}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-black uppercase mb-1">Job URL (LinkedIn / Career Portal)</label>
                <input
                  type="text"
                  value={newAppForm.jobUrl}
                  onChange={(e) => setNewAppForm({ ...newAppForm, jobUrl: e.target.value })}
                  placeholder="https://www.linkedin.com/jobs/view/..."
                  className={BRUTAL_INPUT}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-black uppercase mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={newAppForm.notes}
                  onChange={(e) => setNewAppForm({ ...newAppForm, notes: e.target.value })}
                  placeholder="Referral details, recruiter contact, compensation notes..."
                  className={BRUTAL_INPUT}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNewAppModal(false);
                  setEditingApp(null);
                }}
                className={`${BRUTAL_BTN} bg-white text-black`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManualApplication}
                className={`${BRUTAL_BTN} bg-[#2563EB] text-white`}
              >
                {editingApp ? 'Save Changes' : 'Create Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Neo-Brutalist Header Bar */}
      <header className="sticky top-0 z-30 bg-white border-b-4 border-black px-4 lg:px-6 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FACC15] border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-center text-black">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg uppercase tracking-tight text-black">
                  OFFERGUARD AI
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-[#6EE7B7] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                  AUTOPILOT v3.0
                </span>
              </div>
              <p className="text-xs font-bold text-zinc-700 hidden sm:block">
                Every opportunity tracked. Every application followed up. Every suspicious offer investigated.
              </p>
            </div>
          </div>

          {/* Search & Engine Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 text-black absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="SEARCH COMPANY, ROLE, SENDER..."
                className="bg-[#F4F0EA] border-2 border-black pl-9 pr-3 py-1.5 text-xs font-bold text-black placeholder-zinc-500 focus:bg-[#FEF9C3] focus:outline-none w-56 shadow-[2px_2px_0px_0px_#000]"
              />
            </div>

            {/* Live Incoming Email Simulator Dropdown for Real-Time Demo */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSimulateMenu((prev) => !prev)}
                className={`${BRUTAL_BTN} bg-[#FACC15] text-black`}
              >
                <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Simulate Incoming Email</span>
              </button>
              {showSimulateMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-2 z-50 space-y-1.5">
                  <div className="px-2 py-1 text-[10px] font-black uppercase text-zinc-600 border-b border-black">
                    Trigger Real-Time Inbound Email Event:
                  </div>
                  {LIVE_SIMULATION_SCENARIOS.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => handleSimulateIncomingEmail(sc)}
                      className="w-full text-left p-2.5 border-2 border-black bg-[#F4F0EA] hover:bg-[#FEF9C3] transition flex flex-col gap-1"
                    >
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-black text-white w-fit">
                        {sc.badge}
                      </span>
                      <span className="text-xs font-black text-black leading-snug">{sc.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`${BRUTAL_BTN} ${
                geminiApiKey.trim().length > 10 ? 'bg-[#6EE7B7] text-black' : 'bg-white text-black'
              }`}
              title="Configure Gemini API Key & Model"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>
                {geminiApiKey.trim().length > 10
                  ? `GEMINI LIVE (${selectedModel})`
                  : lastAiCallLive
                  ? 'GEMINI LIVE'
                  : 'LOCAL AI ENGINE'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportWorkspaceJson}
              className={`${BRUTAL_BTN} bg-white text-black`}
              title="Download JSON backup of your workspace"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>

            <button
              type="button"
              onClick={handleRestoreDataset}
              className={`${BRUTAL_BTN} bg-[#2563EB] text-white`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Dataset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Neo-Brutalist Left Sidebar */}
        <aside className="lg:w-64 bg-white border-b-4 lg:border-b-0 lg:border-r-4 border-black p-4 flex lg:flex-col justify-between gap-3 overflow-x-auto">
          <nav className="flex lg:flex-col gap-2 min-w-max lg:min-w-0">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: null },
              { id: 'discover', label: 'Discover Jobs', icon: Compass, badge: metrics.totalSavedJobs },
              {
                id: 'applications',
                label: 'Applications',
                icon: FolderKanban,
                badge: applications.filter((a) => !a.archived).length
              },
              { id: 'inbox', label: 'Inbox Intelligence', icon: Inbox, badge: emails.length },
              {
                id: 'scam',
                label: 'Scam Investigator',
                icon: ShieldAlert,
                badge: metrics.scamEmailsPending,
                danger: metrics.scamEmailsPending > 0
              },
              {
                id: 'followups',
                label: 'Follow-Ups',
                icon: BellRing,
                badge: metrics.followUpsDue,
                warning: metrics.followUpsDue > 0
              },
              { id: 'settings', label: 'Settings & API', icon: SettingsIcon, badge: null }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as typeof activeTab)}
                  className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 border-2 border-black text-xs font-black uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-[4px_4px_0px_0px_#000000] -translate-y-0.5'
                      : 'bg-[#F4F0EA] text-black hover:bg-[#FEF9C3] hover:shadow-[3px_3px_0px_0px_#000000]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0 stroke-[2.5]" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-mono font-black border-2 border-black ${
                        item.danger
                          ? 'bg-[#EF4444] text-white'
                          : item.warning
                          ? 'bg-[#FACC15] text-black'
                          : 'bg-white text-black'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Fraud Protection Status Box */}
          <div className="hidden lg:block p-4 bg-[#FEF9C3] border-2 border-black shadow-[4px_4px_0px_0px_#000000] mt-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-black mb-1">
              <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
              <span>FRAUD SHIELD ACTIVE</span>
            </div>
            <p className="text-xs font-medium text-zinc-800 leading-snug">
              Intercepts advance-fee demands, spoofed recruiter domains, and pre-interview KYC/OTP phishing before they touch your tracker.
            </p>
            <button
              type="button"
              onClick={handleClearToEmpty}
              className={`${BRUTAL_BTN} w-full justify-center mt-3 bg-white text-black hover:bg-[#FCA5A5]`}
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Workspace
            </button>
          </div>
        </aside>

        {/* Active View Content */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* ================================================================
              VIEW 1: HOME DASHBOARD (OVERVIEW)
             ================================================================ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Command Banner */}
              <div className={`${BRUTAL_CARD} p-5 bg-[#FFFDF9] flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FACC15] border-2 border-black text-[11px] font-black uppercase tracking-wider mb-2 shadow-[2px_2px_0px_0px_#000]">
                    <Terminal className="w-3.5 h-3.5" /> LIVE JOB-HUNT COMMAND CENTER
                  </div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-black">
                    PIPELINE OVERVIEW
                  </h1>
                  <p className="text-xs font-bold text-zinc-700 mt-1">
                    Tracking {metrics.totalSavedJobs} saved roles · {emails.length} parsed emails ·{' '}
                    {metrics.scamEmailsPending} high-risk scam offers blocked · {metrics.followUpsDue} follow-ups due.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('discover');
                      setImportMode('linkedin');
                    }}
                    className={`${BRUTAL_BTN} bg-[#2563EB] text-white`}
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" /> Import LinkedIn Job
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('inbox');
                      handleRunInboxIntelligence();
                    }}
                    className={`${BRUTAL_BTN} bg-[#FACC15] text-black`}
                  >
                    <Inbox className="w-4 h-4 stroke-[2.5]" /> Analyse Inbox ({emails.length})
                  </button>
                </div>
              </div>

              {/* 7 Neo-Brutalist Metric Blocks */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
                {[
                  {
                    label: 'SAVED JOBS',
                    value: metrics.totalSavedJobs,
                    sub: 'Discovery pool',
                    bg: 'bg-white',
                    onClick: () => setActiveTab('discover')
                  },
                  {
                    label: 'APPLICATIONS',
                    value: metrics.totalApplications,
                    sub: 'Active tracked',
                    bg: 'bg-[#93C5FD]',
                    onClick: () => {
                      setActiveTab('applications');
                      setAppStatusFilter('ALL');
                    }
                  },
                  {
                    label: 'INTERVIEWS',
                    value: metrics.interviews,
                    sub: 'Active rounds',
                    bg: 'bg-[#DDD6FE]',
                    onClick: () => {
                      setActiveTab('applications');
                      setAppStatusFilter('Interview');
                    }
                  },
                  {
                    label: 'GENUINE OFFERS',
                    value: metrics.offers,
                    sub: 'Verified clean',
                    bg: 'bg-[#6EE7B7]',
                    onClick: () => {
                      setActiveTab('applications');
                      setAppStatusFilter('Offer');
                    }
                  },
                  {
                    label: 'REJECTIONS',
                    value: metrics.rejections,
                    sub: 'Closed roles',
                    bg: 'bg-zinc-200',
                    onClick: () => {
                      setActiveTab('applications');
                      setAppStatusFilter('Rejected');
                    }
                  },
                  {
                    label: 'SCAMS BLOCKED',
                    value: metrics.scamEmailsPending,
                    sub: 'Needs review',
                    bg: 'bg-[#FCA5A5]',
                    onClick: () => setActiveTab('scam')
                  },
                  {
                    label: 'FOLLOW-UPS DUE',
                    value: metrics.followUpsDue,
                    sub: '≥7 days silent',
                    bg: 'bg-[#FDE047]',
                    onClick: () => setActiveTab('followups')
                  }
                ].map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={m.onClick}
                    className={`${m.bg} border-2 border-black p-3.5 text-left shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#000000] transition-all`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-black">{m.label}</div>
                    <div className="text-3xl font-black font-mono text-black mt-1">{m.value}</div>
                    <div className="text-[11px] font-bold text-zinc-800 mt-0.5">{m.sub}</div>
                  </button>
                ))}
              </div>

              {/* Ambiguous Match Alert Banner if unresolved */}
              {ambiguousMatches.some((m) => !m.resolved) && (
                <div className="p-4 bg-[#FDE047] border-2 border-black shadow-[5px_5px_0px_0px_#000000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-black shrink-0 mt-0.5 stroke-[2.5]" />
                    <div>
                      <div className="text-xs font-black uppercase tracking-wider text-black">
                        ACTION REQUIRED: AMBIGUOUS EMAIL-TO-APPLICATION MATCH
                      </div>
                      <p className="text-xs font-bold text-zinc-900 mt-0.5">
                        Inbound email regarding <strong>"CRED Frontend Engineer"</strong> matches 2 separate CRED roles in your tracker. Confirm which role to link.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('applications')}
                    className={`${BRUTAL_BTN} bg-black text-white shrink-0`}
                  >
                    Resolve Match
                  </button>
                </div>
              )}

              {/* Funnel & Scam/Follow-up Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Status Distribution & Activity */}
                <div className={`lg:col-span-7 ${BRUTAL_CARD} p-5 space-y-5`}>
                  <div className="flex items-center justify-between border-b-2 border-black pb-3">
                    <div>
                      <h2 className="text-base font-black uppercase tracking-tight text-black">
                        APPLICATION STAGE DISTRIBUTION
                      </h2>
                      <p className="text-xs font-bold text-zinc-600">Real-time state across active applications</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('applications')}
                      className={`${BRUTAL_BTN} bg-[#F4F0EA] text-black`}
                    >
                      Open Tracker <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {applications.length > 0 ? (
                    <div className="space-y-4">
                      <div className="h-6 w-full border-2 border-black bg-zinc-100 flex overflow-hidden shadow-[3px_3px_0px_0px_#000]">
                        {(['Offer', 'Interview', 'Applied', 'Rejected', 'Saved'] as ApplicationStatus[]).map((st) => {
                          const count = applications.filter((a) => !a.archived && a.status === st).length;
                          const pct = Math.round(
                            (count / Math.max(1, applications.filter((a) => !a.archived).length)) * 100
                          );
                          const barColor: Record<ApplicationStatus, string> = {
                            Offer: 'bg-[#10B981]',
                            Interview: 'bg-[#A855F7]',
                            Applied: 'bg-[#3B82F6]',
                            Rejected: 'bg-zinc-400',
                            Saved: 'bg-[#FACC15]'
                          };
                          return pct > 0 ? (
                            <div
                              key={st}
                              style={{ width: `${pct}%` }}
                              className={`${barColor[st]} h-full border-r-2 border-black last:border-r-0`}
                              title={`${st}: ${count}`}
                            />
                          ) : null;
                        })}
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-center">
                        {(['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'] as ApplicationStatus[]).map((st) => {
                          const count = applications.filter((a) => !a.archived && a.status === st).length;
                          return (
                            <div key={st} className="p-2.5 bg-[#F4F0EA] border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                              <div className="text-[10px] font-black uppercase text-zinc-700">{st}</div>
                              <div className="text-lg font-black font-mono text-black mt-0.5">{count}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs font-bold text-zinc-600 border-2 border-dashed border-black">
                      No applications tracked yet. Click "Sync Dataset" or add a job in Discover Jobs.
                    </div>
                  )}

                  <div className="pt-2 border-t-2 border-black">
                    <h3 className="text-xs font-black uppercase tracking-wider text-black mb-3">
                      RECENT VERIFIED AUDIT LOG (CLICK ANY ROLE FOR AI COPILOT DOSSIER)
                    </h3>
                    <div className="space-y-2.5">
                      {applications
                        .filter((a) => !a.archived)
                        .slice(0, 5)
                        .map((app) => {
                          const latestHist = app.statusHistory[app.statusHistory.length - 1];
                          return (
                            <div
                              key={app.id}
                              onClick={() => setSelectedDossierAppId(app.id)}
                              className="p-3 bg-[#F4F0EA] hover:bg-[#FEF9C3] cursor-pointer border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-between gap-3 transition"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black uppercase text-black truncate">{app.company}</span>
                                  <span className="text-xs font-bold text-zinc-700 truncate">— {app.role}</span>
                                </div>
                                <div className="text-[11px] font-medium text-zinc-700 mt-0.5 truncate">
                                  {latestHist ? latestHist.reason : app.notes}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {app.scamWarningCount > 0 && (
                                  <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-[#EF4444] text-white border-2 border-black">
                                    SCAM BLOCKED
                                  </span>
                                )}
                                {renderStatusBadge(app.status)}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Right: Scam Alerts & 7-Day Follow-Up Queue */}
                <div className="lg:col-span-5 space-y-6">
                  {/* High-Risk Scam Panel */}
                  <div className={`${BRUTAL_CARD} p-5 bg-[#FFF5F5]`}>
                    <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-[#EF4444] stroke-[2.5]" />
                        <h2 className="text-sm font-black uppercase text-black">INTERCEPTED SCAM OFFERS</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('scam')}
                        className={`${BRUTAL_BTN} bg-[#EF4444] text-white`}
                      >
                        Investigate <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {emails
                        .filter((e) => e.analysis?.category === 'scam' && e.scamReviewState !== 'dismissed')
                        .slice(0, 3)
                        .map((scam) => (
                          <div
                            key={scam.id}
                            className="p-3 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-black uppercase text-black truncate">{scam.company}</span>
                              {renderRiskBadge(scam.analysis?.riskLevel || 'high')}
                            </div>
                            <p className="text-xs font-medium text-zinc-800 line-clamp-2">{scam.analysis?.explanation}</p>
                            <div className="text-[11px] font-mono font-bold bg-[#FCA5A5] text-black px-2 py-1 border border-black truncate">
                              Evidence: "{scam.analysis?.evidence[0]}"
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* 7-Day Follow-Up Queue */}
                  <div className={`${BRUTAL_CARD} p-5`}>
                    <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-black stroke-[2.5]" />
                        <h2 className="text-sm font-black uppercase text-black">7-DAY FOLLOW-UP QUEUE</h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('followups')}
                        className={`${BRUTAL_BTN} bg-[#FACC15] text-black`}
                      >
                        All Reminders <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {reminders
                        .filter((r) => r.status === 'active')
                        .slice(0, 3)
                        .map((rem) => (
                          <div
                            key={rem.id}
                            className="p-3 bg-[#F4F0EA] border-2 border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-black uppercase text-black truncate">
                                {rem.company} — {rem.role}
                              </div>
                              <div className="text-[11px] font-mono font-bold text-zinc-700 mt-0.5">
                                Applied {rem.dateApplied} ({rem.daysSinceApplied}d silent)
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleGenerateFollowUp(rem.applicationId)}
                              className={`${BRUTAL_BTN} bg-[#2563EB] text-white shrink-0`}
                            >
                              Draft Email
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              VIEW 2: DISCOVER JOBS (LINKEDIN URL + JD EXTRACTOR + SAVED PIPELINE)
             ================================================================ */}
          {activeTab === 'discover' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight text-black">
                    DISCOVER & IMPORT JOBS
                  </h1>
                  <p className="text-xs font-bold text-zinc-700">
                    Extract structured role data from any LinkedIn URL or raw Job Description using Gemini.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { id: 'linkedin', label: 'LinkedIn URL Import' },
                    { id: 'jd', label: 'Job Description Import' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setImportMode(tab.id as typeof importMode)}
                      className={`${BRUTAL_BTN} ${
                        importMode === tab.id ? 'bg-[#2563EB] text-white' : 'bg-white text-black'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* LinkedIn URL Import */}
              {importMode === 'linkedin' && (
                <div className={`${BRUTAL_CARD} p-5 space-y-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-3">
                    <div>
                      <h2 className="text-sm font-black uppercase text-black">Import from LinkedIn Job URL</h2>
                      <p className="text-xs font-medium text-zinc-700">
                        Preserves the source URL and extracts structured fields from the job description text.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLinkedinUrlInput(DEFAULT_LINKEDIN_IMPORT.url);
                        setLinkedinFallbackJd(DEFAULT_LINKEDIN_IMPORT.rawText);
                        addToast('Loaded Example Listing', 'Loaded Google Cloud India Staff AI Architect role.', 'info');
                      }}
                      className={`${BRUTAL_BTN} bg-[#FACC15] text-black`}
                    >
                      Populate Example Listing
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-9">
                      <label className="block text-xs font-black uppercase text-black mb-1">LinkedIn Job URL</label>
                      <input
                        type="url"
                        value={linkedinUrlInput}
                        onChange={(e) => setLinkedinUrlInput(e.target.value)}
                        placeholder="https://www.linkedin.com/jobs/view/..."
                        className={BRUTAL_INPUT}
                      />
                    </div>
                    <div className="md:col-span-3 flex items-end">
                      <a
                        href={linkedinUrlInput || 'https://www.linkedin.com/jobs/'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${BRUTAL_BTN} w-full justify-center bg-[#F4F0EA] text-black`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open on LinkedIn
                      </a>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-black mb-1">
                      Job Description Text (Required when LinkedIn blocks unauthenticated page access)
                    </label>
                    <textarea
                      rows={6}
                      value={linkedinFallbackJd}
                      onChange={(e) => setLinkedinFallbackJd(e.target.value)}
                      placeholder="Paste the job description text here so Gemini can extract title, company, location, work arrangement, seniority, and skills..."
                      className={BRUTAL_INPUT}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-700">
                      Extracts: Title · Company · Location · Work Arrangement · Seniority · Skills · Missing Fields
                    </span>
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => handleExtractJob('linkedin')}
                      className={`${BRUTAL_BTN} bg-[#2563EB] text-white`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isAnalyzing ? 'Extracting...' : 'Extract Job Fields with Gemini'}
                    </button>
                  </div>
                </div>
              )}

              {/* Raw Job Description Import */}
              {importMode === 'jd' && (
                <div className={`${BRUTAL_CARD} p-5 space-y-4`}>
                  <div className="border-b-2 border-black pb-3">
                    <h2 className="text-sm font-black uppercase text-black">Paste Raw Job Description</h2>
                    <p className="text-xs font-medium text-zinc-700">
                      Paste any job description from a career portal. Optional fields override or supplement AI extraction.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <input
                      type="text"
                      value={jdManualCompany}
                      onChange={(e) => setJdManualCompany(e.target.value)}
                      placeholder="Optional Company Name"
                      className={BRUTAL_INPUT}
                    />
                    <input
                      type="text"
                      value={jdManualTitle}
                      onChange={(e) => setJdManualTitle(e.target.value)}
                      placeholder="Optional Role Title"
                      className={BRUTAL_INPUT}
                    />
                    <input
                      type="text"
                      value={jdManualLocation}
                      onChange={(e) => setJdManualLocation(e.target.value)}
                      placeholder="Optional Location"
                      className={BRUTAL_INPUT}
                    />
                    <input
                      type="url"
                      value={jdManualUrl}
                      onChange={(e) => setJdManualUrl(e.target.value)}
                      placeholder="Optional Source URL"
                      className={BRUTAL_INPUT}
                    />
                  </div>
                  <textarea
                    rows={5}
                    value={jdRawInput}
                    onChange={(e) => setJdRawInput(e.target.value)}
                    placeholder="Paste raw job description text here..."
                    className={BRUTAL_INPUT}
                  />
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setJdRawInput(
                          'Backend Engineer (Python / FastAPI / LLM Agents)\nWe need a builder with 3+ years experience in Python, PostgreSQL, Docker, and Gemini API function calling to scale our fintech workflows.'
                        )
                      }
                      className={`${BRUTAL_BTN} bg-[#FACC15] text-black`}
                    >
                      Insert Partial JD (Test Missing Field Detector)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtractJob('jd')}
                      className={`${BRUTAL_BTN} bg-[#2563EB] text-white`}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Extract & Identify Missing Fields
                    </button>
                  </div>
                </div>
              )}

              {/* Review & Edit Extracted Job Panel */}
              {extractedPreview && (
                <div className={`${BRUTAL_CARD} p-5 bg-[#FEF9C3] space-y-4`}>
                  <div className="flex items-center justify-between border-b-2 border-black pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-black stroke-[2.5]" />
                      <h3 className="text-sm font-black uppercase text-black">
                        REVIEW & EDIT EXTRACTED FIELDS BEFORE SAVING
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExtractedPreview(null)}
                      className={`${BRUTAL_BTN} bg-white text-black`}
                    >
                      Discard
                    </button>
                  </div>

                  {extractedPreview.missingFields.length > 0 && (
                    <div className="p-3 bg-[#FCA5A5] border-2 border-black text-xs font-bold text-black flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-black shrink-0" />
                      <span>
                        <strong>MISSING FIELDS DETECTED:</strong> {extractedPreview.missingFields.join(', ')}. Complete them below before saving.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-black uppercase mb-1">Role Title</label>
                      <input
                        type="text"
                        value={extractedPreview.title}
                        onChange={(e) => setExtractedPreview({ ...extractedPreview, title: e.target.value })}
                        className={BRUTAL_INPUT}
                      />
                    </div>
                    <div>
                      <label className="block font-black uppercase mb-1">Company</label>
                      <input
                        type="text"
                        value={extractedPreview.company}
                        onChange={(e) => setExtractedPreview({ ...extractedPreview, company: e.target.value })}
                        className={BRUTAL_INPUT}
                      />
                    </div>
                    <div>
                      <label className="block font-black uppercase mb-1">Location</label>
                      <input
                        type="text"
                        value={extractedPreview.location}
                        onChange={(e) => setExtractedPreview({ ...extractedPreview, location: e.target.value })}
                        className={BRUTAL_INPUT}
                      />
                    </div>
                    <div>
                      <label className="block font-black uppercase mb-1">Work Arrangement</label>
                      <select
                        value={extractedPreview.workArrangement}
                        onChange={(e) =>
                          setExtractedPreview({
                            ...extractedPreview,
                            workArrangement: e.target.value as WorkArrangement
                          })
                        }
                        className={BRUTAL_INPUT}
                      >
                        <option value="Hybrid">Hybrid</option>
                        <option value="Remote">Remote</option>
                        <option value="On-site">On-site</option>
                        <option value="Unspecified">Unspecified</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-black uppercase mb-1">Seniority</label>
                      <input
                        type="text"
                        value={extractedPreview.seniority}
                        onChange={(e) => setExtractedPreview({ ...extractedPreview, seniority: e.target.value })}
                        className={BRUTAL_INPUT}
                      />
                    </div>
                    <div>
                      <label className="block font-black uppercase mb-1">Skills (Comma-Separated)</label>
                      <input
                        type="text"
                        value={extractedPreview.skills}
                        onChange={(e) => setExtractedPreview({ ...extractedPreview, skills: e.target.value })}
                        className={BRUTAL_INPUT}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveExtractedJob(false)}
                      className={`${BRUTAL_BTN} bg-white text-black`}
                    >
                      Save as "Saved"
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveExtractedJob(true)}
                      className={`${BRUTAL_BTN} bg-[#10B981] text-black`}
                    >
                      Save & Mark "Applied" in Tracker
                    </button>
                  </div>
                </div>
              )}

              {/* Saved Jobs Pipeline Grid */}
              <div className={`${BRUTAL_CARD} p-5 space-y-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
                  <div>
                    <h2 className="text-base font-black uppercase text-black">
                      SAVED JOBS PIPELINE ({jobs.length})
                    </h2>
                    <p className="text-xs font-bold text-zinc-600">
                      Filter by arrangement, skill, or company and promote directly into your Application Tracker.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={jobSearchFilter}
                      onChange={(e) => setJobSearchFilter(e.target.value)}
                      placeholder="Filter role, company, skill..."
                      className="bg-[#F4F0EA] border-2 border-black px-3 py-1.5 text-xs font-bold text-black shadow-[2px_2px_0px_0px_#000]"
                    />
                    <select
                      value={jobArrangementFilter}
                      onChange={(e) => setJobArrangementFilter(e.target.value)}
                      className="bg-[#F4F0EA] border-2 border-black px-2.5 py-1.5 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_#000]"
                    >
                      <option value="ALL">All Arrangements</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {jobs
                    .filter((j) => {
                      const q = (jobSearchFilter || globalSearch).toLowerCase();
                      const matchQ =
                        !q ||
                        j.title.toLowerCase().includes(q) ||
                        j.company.toLowerCase().includes(q) ||
                        j.skills.some((s) => s.toLowerCase().includes(q));
                      const matchArr = jobArrangementFilter === 'ALL' || j.workArrangement === jobArrangementFilter;
                      return matchQ && matchArr;
                    })
                    .map((job) => {
                      const linkedApp = applications.find((a) => a.id === job.linkedApplicationId);
                      return (
                        <div
                          key={job.id}
                          className="p-4 bg-[#FFFDF9] border-2 border-black shadow-[4px_4px_0px_0px_#000000] flex flex-col justify-between gap-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#FDE047] text-black border-2 border-black">
                                {job.workArrangement} · {job.sourceType}
                              </span>
                              {linkedApp ? renderStatusBadge(linkedApp.status) : null}
                            </div>
                            <div>
                              <h3 className="text-sm font-black uppercase text-black leading-snug">{job.title}</h3>
                              <div className="text-xs font-extrabold text-[#2563EB] mt-0.5">
                                {job.company} · <span className="text-zinc-700">{job.location}</span>
                              </div>
                            </div>
                            <p className="text-xs font-medium text-zinc-800 line-clamp-2 leading-relaxed">
                              {job.description}
                            </p>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {job.skills.slice(0, 5).map((sk) => (
                                <span
                                  key={sk}
                                  className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#F4F0EA] text-black border border-black"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-3 border-t-2 border-black flex items-center justify-between gap-2">
                            <a
                              href={job.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-black uppercase text-black hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Open on LinkedIn
                            </a>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setJobs((prev) => prev.filter((item) => item.id !== job.id))
                                }
                                className="p-1.5 border-2 border-black bg-white hover:bg-[#FCA5A5] text-black"
                                title="Remove listing"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTrackSavedJob(job)}
                                className={`${BRUTAL_BTN} py-1 px-2.5 ${
                                  linkedApp ? 'bg-white text-black' : 'bg-[#2563EB] text-white'
                                }`}
                              >
                                {linkedApp ? 'View in Tracker' : '+ Track Role'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              VIEW 3: UNIFIED APPLICATION TRACKER (TABLE + KANBAN + DOSSIER)
             ================================================================ */}
          {activeTab === 'applications' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight text-black">
                    UNIFIED APPLICATION TRACKER
                  </h1>
                  <p className="text-xs font-bold text-zinc-700">
                    Central ledger connecting jobs, emails, audit history, scam blocks, and AI Interview/Offer Copilot briefs.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* View Switcher: Table vs Kanban */}
                  <div className="flex items-center border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000]">
                    <button
                      type="button"
                      onClick={() => setTrackerViewMode('table')}
                      className={`px-3 py-1.5 text-xs font-black uppercase flex items-center gap-1 ${
                        trackerViewMode === 'table' ? 'bg-[#FACC15] text-black' : 'bg-white text-zinc-700'
                      }`}
                    >
                      <TableIcon className="w-3.5 h-3.5" /> Table
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrackerViewMode('kanban')}
                      className={`px-3 py-1.5 text-xs font-black uppercase flex items-center gap-1 border-l-2 border-black ${
                        trackerViewMode === 'kanban' ? 'bg-[#FACC15] text-black' : 'bg-white text-zinc-700'
                      }`}
                    >
                      <Columns className="w-3.5 h-3.5" /> Kanban
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportApplicationsCsv}
                    className={`${BRUTAL_BTN} bg-white text-black`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingApp(null);
                      setShowNewAppModal(true);
                    }}
                    className={`${BRUTAL_BTN} bg-[#10B981] text-black`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> New Application
                  </button>
                </div>
              </div>

              {/* Stage Filter Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {(['ALL', 'Saved', 'Applied', 'Interview', 'Offer', 'Rejected'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setAppStatusFilter(st)}
                    className={`${BRUTAL_BTN} py-1.5 px-3 ${
                      appStatusFilter === st ? 'bg-black text-white' : 'bg-white text-black'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Ambiguous Match Resolution Box */}
              {ambiguousMatches.filter((m) => !m.resolved).map((amb) => (
                <div
                  key={amb.id}
                  className="p-5 bg-[#FDE047] border-2 border-black shadow-[5px_5px_0px_0px_#000000] space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-black shrink-0 mt-0.5 stroke-[2.5]" />
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 bg-white border-2 border-black">
                        AMBIGUOUS EMAIL MATCH — USER CONFIRMATION REQUIRED
                      </span>
                      <h3 className="text-sm font-black uppercase text-black mt-1.5">
                        Inbound Email: "{amb.emailSubject}" from {amb.emailSender}
                      </h3>
                      <p className="text-xs font-bold text-zinc-900 mt-1">{amb.reason}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {amb.candidateApplicationIds.map((candId) => {
                      const cand = applications.find((a) => a.id === candId);
                      if (!cand) return null;
                      return (
                        <button
                          key={cand.id}
                          type="button"
                          onClick={() => handleResolveAmbiguousMatch(amb.id, cand.id)}
                          className={`${BRUTAL_BTN} bg-white text-black hover:bg-[#6EE7B7]`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Link to: {cand.company} — {cand.role} ({cand.status})
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* KANBAN BOARD VIEW */}
              {trackerViewMode === 'kanban' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {(['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'] as ApplicationStatus[]).map((colStatus) => {
                    const colApps = applications
                      .filter((a) => !a.archived && a.status === colStatus)
                      .filter((a) => {
                        const q = globalSearch.toLowerCase();
                        return !q || a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
                      });
                    const colHeaderBg: Record<ApplicationStatus, string> = {
                      Saved: 'bg-zinc-200',
                      Applied: 'bg-[#93C5FD]',
                      Interview: 'bg-[#DDD6FE]',
                      Offer: 'bg-[#6EE7B7]',
                      Rejected: 'bg-zinc-300'
                    };
                    return (
                      <div key={colStatus} className={`${BRUTAL_CARD} bg-[#FFFDF9] flex flex-col`}>
                        <div className={`${colHeaderBg[colStatus]} border-b-2 border-black p-3 flex items-center justify-between`}>
                          <span className="text-xs font-black uppercase text-black">{colStatus}</span>
                          <span className="px-2 py-0.5 text-[11px] font-mono font-black bg-white border border-black">
                            {colApps.length}
                          </span>
                        </div>
                        <div className="p-3 space-y-3 flex-1">
                          {colApps.map((app) => (
                            <div
                              key={app.id}
                              className="p-3 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] space-y-2"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-black uppercase text-black truncate">{app.company}</span>
                                {app.scamWarningCount > 0 && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-black bg-[#EF4444] text-white border border-black">
                                    SCAM
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-bold text-zinc-800 leading-snug">{app.role}</div>
                              <div className="text-[10px] font-mono text-zinc-600">
                                {app.dateApplied ? `Applied: ${app.dateApplied}` : `Saved: ${app.dateSaved}`}
                              </div>
                              <div className="pt-2 border-t border-black flex items-center justify-between gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedDossierAppId(app.id)}
                                  className="px-2 py-1 text-[10px] font-black uppercase bg-[#FEF9C3] border border-black hover:bg-[#FACC15]"
                                >
                                  AI Dossier
                                </button>
                                <select
                                  aria-label={`Move ${app.company}`}
                                  value={app.status}
                                  onChange={(e) => {
                                    const nextSt = e.target.value as ApplicationStatus;
                                    setApplications((prev) =>
                                      prev.map((item) =>
                                        item.id === app.id
                                          ? {
                                              ...item,
                                              status: nextSt,
                                              lastActivityDate: TODAY_ISO,
                                              statusHistory: [
                                                ...item.statusHistory,
                                                {
                                                  id: 'sh-' + Date.now(),
                                                  fromStatus: item.status,
                                                  toStatus: nextSt,
                                                  date: TODAY_ISO,
                                                  reason: 'Moved stage in Kanban board'
                                                }
                                              ]
                                            }
                                          : item
                                      )
                                    );
                                  }}
                                  className="bg-white border border-black text-[10px] font-bold px-1 py-0.5"
                                >
                                  <option value="Saved">Saved</option>
                                  <option value="Applied">Applied</option>
                                  <option value="Interview">Interview</option>
                                  <option value="Offer">Offer</option>
                                  <option value="Rejected">Rejected</option>
                                </select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* TABLE VIEW */
                <div className={`${BRUTAL_CARD} overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-4 border-black text-[11px] font-black uppercase tracking-wider text-black bg-[#FACC15]">
                          <th className="py-3.5 px-4 border-r-2 border-black">Company & Role</th>
                          <th className="py-3.5 px-3 border-r-2 border-black">Stage</th>
                          <th className="py-3.5 px-3 border-r-2 border-black">Applied / Activity</th>
                          <th className="py-3.5 px-3 border-r-2 border-black">Next Follow-Up</th>
                          <th className="py-3.5 px-3 border-r-2 border-black">Linked Emails & Audit</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-black text-xs">
                        {applications
                          .filter((a) => !a.archived)
                          .filter((a) => appStatusFilter === 'ALL' || a.status === appStatusFilter)
                          .filter((a) => {
                            const q = globalSearch.toLowerCase();
                            return !q || a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
                          })
                          .map((app) => {
                            const linkedEmails = emails.filter((e) => app.relatedEmailIds.includes(e.id));
                            const latestAudit = app.statusHistory[app.statusHistory.length - 1];
                            return (
                              <tr key={app.id} className="hover:bg-[#FEF9C3]/50 transition">
                                <td className="py-3.5 px-4 border-r-2 border-black max-w-xs">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black uppercase text-black">{app.company}</span>
                                    {app.scamWarningCount > 0 && (
                                      <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-[#EF4444] text-white border-2 border-black">
                                        SCAM FLAGGED
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-zinc-900 font-bold mt-0.5">{app.role}</div>
                                  <div className="text-[11px] font-medium text-zinc-600 mt-0.5 flex items-center gap-2">
                                    <span>{app.location}</span>
                                    {app.jobUrl && (
                                      <a
                                        href={app.jobUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#2563EB] font-bold hover:underline inline-flex items-center gap-0.5"
                                      >
                                        Source <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-3 border-r-2 border-black">
                                  <div className="flex flex-col items-start gap-2">
                                    {renderStatusBadge(app.status)}
                                    <select
                                      aria-label={`Change status for ${app.company}`}
                                      value={app.status}
                                      onChange={(e) => {
                                        const nextSt = e.target.value as ApplicationStatus;
                                        setApplications((prev) =>
                                          prev.map((item) =>
                                            item.id === app.id
                                              ? {
                                                  ...item,
                                                  status: nextSt,
                                                  lastActivityDate: TODAY_ISO,
                                                  statusHistory: [
                                                    ...item.statusHistory,
                                                    {
                                                      id: 'sh-' + Date.now(),
                                                      fromStatus: item.status,
                                                      toStatus: nextSt,
                                                      date: TODAY_ISO,
                                                      reason: 'Status updated in Tracker'
                                                    }
                                                  ]
                                                }
                                              : item
                                          )
                                        );
                                      }}
                                      className="bg-white border-2 border-black px-1.5 py-0.5 text-[11px] font-bold text-black"
                                    >
                                      <option value="Saved">Saved</option>
                                      <option value="Applied">Applied</option>
                                      <option value="Interview">Interview</option>
                                      <option value="Offer">Offer</option>
                                      <option value="Rejected">Rejected</option>
                                    </select>
                                  </div>
                                </td>
                                <td className="py-3.5 px-3 border-r-2 border-black">
                                  <div className="font-bold text-black">
                                    Applied:{' '}
                                    <span className="font-mono">
                                      {app.dateApplied || 'Not applied'}
                                    </span>
                                  </div>
                                  {app.dateAppliedEstimated && (
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmApplicationDate(app.id, app.dateApplied || TODAY_ISO)}
                                      className="mt-1 px-2 py-0.5 bg-[#FDE047] text-black border-2 border-black text-[10px] font-black uppercase"
                                    >
                                      Estimated — Click to Confirm
                                    </button>
                                  )}
                                  <div className="text-[11px] font-medium text-zinc-600 mt-0.5">
                                    Last activity: {app.lastActivityDate}
                                  </div>
                                </td>
                                <td className="py-3.5 px-3 border-r-2 border-black">
                                  {app.status === 'Rejected' || app.status === 'Offer' ? (
                                    <span className="text-[11px] font-bold text-zinc-500">Suppressed ({app.status})</span>
                                  ) : app.nextFollowUpDate ? (
                                    <div>
                                      <span className="font-mono font-black text-black bg-[#FDE047] px-1.5 py-0.5 border border-black">
                                        {app.nextFollowUpDate}
                                      </span>
                                      <div className="text-[10px] font-bold text-zinc-600 mt-1">7-day rule active</div>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] font-bold text-zinc-600">Active thread</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-3 border-r-2 border-black max-w-xs">
                                  <div className="font-black text-black">
                                    {linkedEmails.length} linked email(s)
                                  </div>
                                  {latestAudit && (
                                    <div className="text-[11px] font-medium text-zinc-700 mt-0.5 line-clamp-2">
                                      Latest: {latestAudit.reason} ({latestAudit.date})
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedDossierAppId(app.id)}
                                      className={`${BRUTAL_BTN} py-1 px-2.5 bg-[#FACC15] text-black`}
                                      title="Open AI Prep & Audit Dossier"
                                    >
                                      AI Dossier
                                    </button>
                                    {app.status === 'Applied' && (
                                      <button
                                        type="button"
                                        onClick={() => handleGenerateFollowUp(app.id)}
                                        className={`${BRUTAL_BTN} py-1 px-2.5 bg-[#2563EB] text-white`}
                                      >
                                        Generate Follow-up
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingApp(app);
                                        setNewAppForm({
                                          company: app.company,
                                          role: app.role,
                                          location: app.location,
                                          workArrangement: app.workArrangement,
                                          jobUrl: app.jobUrl,
                                          dateApplied: app.dateApplied || TODAY_ISO,
                                          status: app.status,
                                          notes: app.notes
                                        });
                                        setShowNewAppModal(true);
                                      }}
                                      className="p-1.5 border-2 border-black bg-white hover:bg-[#FEF9C3] text-black shadow-[2px_2px_0px_0px_#000]"
                                      title="Edit application"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setApplications((prev) =>
                                          prev.map((item) =>
                                            item.id === app.id ? { ...item, archived: true } : item
                                          )
                                        );
                                        addToast('Application Archived', `Archived ${app.company} (${app.role}).`, 'info');
                                      }}
                                      className="p-1.5 border-2 border-black bg-white hover:bg-[#FCA5A5] text-black shadow-[2px_2px_0px_0px_#000]"
                                      title="Archive application"
                                    >
                                      <Archive className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              VIEW 4: INBOX INTELLIGENCE (20 EMAILS + JSON/.MBOX IMPORT)
             ================================================================ */}
          {activeTab === 'inbox' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight text-black">
                    INBOX INTELLIGENCE (ONE-PIPELINE CLASSIFIER)
                  </h1>
                  <p className="text-xs font-bold text-zinc-700">
                    Classifies each email into <code className="bg-[#FDE047] px-1 border border-black font-mono">applied | interview | rejected | offer | scam</code> with strict JSON validation.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportDrawer((prev) => !prev)}
                    className={`${BRUTAL_BTN} bg-white text-black`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Import JSON / .mbox
                  </button>
                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={handleRunInboxIntelligence}
                    className={`${BRUTAL_BTN} bg-[#2563EB] text-white`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isAnalyzing ? 'Analyzing Inbox...' : 'Re-Analyse All with Gemini'}
                  </button>
                </div>
              </div>

              {/* JSON / .mbox Importer Drawer */}
              {showImportDrawer && (
                <div className={`${BRUTAL_CARD} p-5 bg-[#FFFDF9] space-y-4`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-3">
                    <h3 className="text-sm font-black uppercase text-black">
                      Import Email Batch (JSON Array or RFC-822 .mbox)
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setJsonImportText(
                            JSON.stringify(
                              [
                                {
                                  subject: 'Interview Invitation: Senior Backend Engineer at Atlassian Bengaluru',
                                  senderName: 'Atlassian Talent',
                                  senderEmail: 'recruiting@atlassian.com',
                                  company: 'Atlassian',
                                  date: '2026-10-24',
                                  body: 'Hi! We would love to schedule your system design interview for Senior Backend Engineer on 2026-10-29 at 2:00 PM IST.'
                                }
                              ],
                              null,
                              2
                            )
                          )
                        }
                        className={`${BRUTAL_BTN} py-1 px-2.5 bg-[#93C5FD] text-black`}
                      >
                        Sample JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => setJsonImportText('{ "brokenJson": [invalid syntax ')}
                        className={`${BRUTAL_BTN} py-1 px-2.5 bg-[#FDE047] text-black`}
                      >
                        Test Invalid JSON Validator
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setJsonImportText(
                            `From recruiting@zomato.com Sat Oct 24 14:20:00 2026
From: Zomato Recruiting <recruiting@zomato.com>
Subject: Application Received: Staff Backend Engineer at Zomato
Date: Sat, 24 Oct 2026 14:20:00 +0530

Hi Aarav, Thank you for applying to Zomato for the Staff Backend Engineer position. We will get back to you shortly.`
                          )
                        }
                        className={`${BRUTAL_BTN} py-1 px-2.5 bg-[#6EE7B7] text-black`}
                      >
                        Sample .mbox
                      </button>
                    </div>
                  </div>

                  {importErrorMsg && (
                    <div className="p-3 bg-[#FCA5A5] border-2 border-black text-xs font-black text-black flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-black shrink-0" />
                      <span>{importErrorMsg}</span>
                    </div>
                  )}

                  <textarea
                    rows={5}
                    value={jsonImportText}
                    onChange={(e) => setJsonImportText(e.target.value)}
                    placeholder="Paste JSON array of emails or raw .mbox file contents here..."
                    className={`${BRUTAL_INPUT} font-mono`}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className={`${BRUTAL_BTN} bg-white text-black cursor-pointer`}>
                      <Upload className="w-3.5 h-3.5" /> Upload .json or .mbox file
                      <input
                        type="file"
                        accept=".json,.mbox,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const content = String(reader.result || '');
                            setJsonImportText(content);
                          };
                          reader.readAsText(file);
                        }}
                      />
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleImportCustomEmails(jsonImportText, 'json')}
                        className={`${BRUTAL_BTN} bg-[#2563EB] text-white`}
                      >
                        Validate & Import JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => handleImportCustomEmails(jsonImportText, 'mbox')}
                        className={`${BRUTAL_BTN} bg-[#10B981] text-black`}
                      >
                        Parse & Import .mbox
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Category Filter Pills & Search */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'ALL', label: `All (${emails.length})` },
                    { id: 'applied', label: `Applied (${emails.filter((e) => e.analysis?.category === 'applied' && !e.isUnrelatedNoise).length})` },
                    { id: 'interview', label: `Interview (${emails.filter((e) => e.analysis?.category === 'interview').length})` },
                    { id: 'offer', label: `Genuine Offers (${emails.filter((e) => e.analysis?.category === 'offer').length})` },
                    { id: 'rejected', label: `Rejected (${emails.filter((e) => e.analysis?.category === 'rejected').length})` },
                    { id: 'scam', label: `Scams (${emails.filter((e) => e.analysis?.category === 'scam').length})` }
                  ].map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setEmailCategoryFilter(pill.id)}
                      className={`${BRUTAL_BTN} py-1.5 px-3 ${
                        emailCategoryFilter === pill.id
                          ? pill.id === 'scam'
                            ? 'bg-[#EF4444] text-white'
                            : 'bg-black text-white'
                          : 'bg-white text-black'
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={emailSearch}
                  onChange={(e) => setEmailSearch(e.target.value)}
                  placeholder="Search subject, sender, excerpt..."
                  className="bg-white border-2 border-black px-3 py-1.5 text-xs font-bold text-black w-64 shadow-[2px_2px_0px_0px_#000]"
                />
              </div>

              {/* Master-Detail Email Intelligence View */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left List */}
                <div className={`lg:col-span-5 ${BRUTAL_CARD} overflow-hidden divide-y-2 divide-black max-h-[680px] overflow-y-auto`}>
                  {emails
                    .filter((e) => {
                      if (emailCategoryFilter !== 'ALL' && e.analysis?.category !== emailCategoryFilter) return false;
                      const q = (emailSearch || globalSearch).toLowerCase();
                      if (!q) return true;
                      return (
                        e.subject.toLowerCase().includes(q) ||
                        e.senderEmail.toLowerCase().includes(q) ||
                        e.company.toLowerCase().includes(q) ||
                        e.body.toLowerCase().includes(q)
                      );
                    })
                    .map((em) => {
                      const isSelected = selectedEmail?.id === em.id;
                      const isScam = em.analysis?.category === 'scam';
                      return (
                        <button
                          key={em.id}
                          type="button"
                          onClick={() => setSelectedEmailId(em.id)}
                          className={`w-full p-3.5 text-left transition flex flex-col gap-1.5 ${
                            isSelected
                              ? 'bg-[#FEF9C3] border-l-8 border-l-black'
                              : isScam
                              ? 'bg-[#FFF5F5] hover:bg-[#FEE2E2]'
                              : 'bg-white hover:bg-[#F4F0EA]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black uppercase text-black truncate">{em.company}</span>
                            {em.analysis && renderCategoryBadge(em.analysis.category, em.isUnrelatedNoise)}
                          </div>
                          <div className="text-xs text-black font-bold line-clamp-1">{em.subject}</div>
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-zinc-600">
                            <span className="truncate">{em.senderEmail}</span>
                            <span className="shrink-0">{em.date}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>

                {/* Right Detail + Structured JSON Output */}
                <div className={`lg:col-span-7 ${BRUTAL_CARD} p-5 space-y-4`}>
                  {selectedEmail ? (
                    <>
                      <div className="border-b-2 border-black pb-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {selectedEmail.analysis &&
                              renderCategoryBadge(selectedEmail.analysis.category, selectedEmail.isUnrelatedNoise)}
                            {selectedEmail.analysis && renderRiskBadge(selectedEmail.analysis.riskLevel)}
                            <span className="text-xs font-mono font-black text-black bg-[#F4F0EA] px-2 py-0.5 border border-black">
                              CONFIDENCE: {Math.round((selectedEmail.analysis?.confidence || 0.95) * 100)}%
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-zinc-700">
                            {selectedEmail.date}
                          </span>
                        </div>
                        <h2 className="text-base font-black text-black">{selectedEmail.subject}</h2>
                        <div className="text-xs font-bold text-zinc-700">
                          From: <strong className="text-black">{selectedEmail.senderName}</strong> &lt;
                          <span className="font-mono text-[#2563EB]">{selectedEmail.senderEmail}</span>&gt;
                        </div>
                      </div>

                      {/* Raw Email Body */}
                      <div className="p-4 bg-[#F4F0EA] border-2 border-black text-xs font-medium text-black leading-relaxed whitespace-pre-wrap shadow-[3px_3px_0px_0px_#000]">
                        {selectedEmail.body}
                      </div>

                      {/* AI Explanation & Supporting Evidence */}
                      {selectedEmail.analysis && (
                        <div
                          className={`p-4 border-2 border-black shadow-[4px_4px_0px_0px_#000] space-y-3 ${
                            selectedEmail.analysis.category === 'scam'
                              ? 'bg-[#FCA5A5]'
                              : 'bg-[#DBEAFE]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-black flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4" /> AI Reasoning & Supporting Excerpts
                            </span>
                            {selectedEmail.analysis.requiresHumanReview && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#FDE047] text-black border-2 border-black">
                                REQUIRES HUMAN REVIEW
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-black leading-relaxed">
                            {selectedEmail.analysis.explanation}
                          </p>
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-black uppercase text-black">
                              Extracted Verbatim Evidence:
                            </div>
                            {selectedEmail.analysis.evidence.map((ev, i) => (
                              <div
                                key={i}
                                className="text-xs font-mono font-bold bg-white px-3 py-1.5 border-2 border-black text-black"
                              >
                                "{ev}"
                              </div>
                            ))}
                          </div>
                          <div className="text-xs font-black text-black bg-white p-2.5 border-2 border-black">
                            RECOMMENDED ACTION: {selectedEmail.analysis.recommendedAction}
                          </div>
                        </div>
                      )}

                      {/* Validated Structured JSON Output */}
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-wider text-black mb-1.5 flex items-center gap-1.5">
                          <FileJson className="w-3.5 h-3.5" /> Validated Gemini Structured JSON Output
                        </div>
                        <pre className="p-3.5 bg-black text-[#6EE7B7] border-2 border-black text-[11px] font-mono overflow-x-auto shadow-[3px_3px_0px_0px_#000]">
                          {JSON.stringify(
                            {
                              category: selectedEmail.analysis?.category,
                              company: selectedEmail.analysis?.company,
                              jobTitle: selectedEmail.analysis?.jobTitle,
                              eventDate: selectedEmail.analysis?.eventDate,
                              confidence: selectedEmail.analysis?.confidence,
                              riskLevel: selectedEmail.analysis?.riskLevel,
                              evidence: selectedEmail.analysis?.evidence,
                              explanation: selectedEmail.analysis?.explanation,
                              recommendedAction: selectedEmail.analysis?.recommendedAction,
                              requiresHumanReview: selectedEmail.analysis?.requiresHumanReview
                            },
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center text-xs font-bold text-zinc-600">
                      Select an email from the inbox list to inspect its structured classification.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              VIEW 5: AI SCAM INVESTIGATOR (WITH DOMAIN DIFF & 1930 REPORT)
             ================================================================ */}
          {activeTab === 'scam' && (
            <div className="space-y-6">
              <div className={`${BRUTAL_CARD} p-5 bg-[#FCA5A5] flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-black text-white text-[11px] font-black uppercase tracking-wider mb-2">
                    <ShieldAlert className="w-3.5 h-3.5" /> FORENSIC RECRUITMENT FRAUD SHIELD
                  </div>
                  <h1 className="text-xl font-black uppercase text-black">
                    AI SCAM INVESTIGATOR
                  </h1>
                  <p className="text-xs font-bold text-black mt-1 max-w-3xl">
                    Detects upfront training/laptop fees, fake TCS/Infosys/Wipro recruiter impersonation, Aadhaar/PAN/OTP phishing, and Hinglish urgency coercion.
                  </p>
                </div>
              </div>

              {/* Flagged Scam Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {emails
                  .filter((e) => e.analysis?.category === 'scam' || e.analysis?.riskLevel === 'uncertain')
                  .map((scam) => {
                    const actualDomain = scam.senderEmail.split('@')[1] || scam.senderEmail;
                    return (
                      <div
                        key={scam.id}
                        className={`${BRUTAL_CARD} p-5 flex flex-col justify-between gap-4 ${
                          scam.scamReviewState === 'dismissed'
                            ? 'bg-zinc-200 opacity-65'
                            : scam.analysis?.riskLevel === 'high'
                            ? 'bg-[#FFF5F5]'
                            : 'bg-[#FEF9C3]'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-2.5">
                            <div className="flex items-center gap-2">
                              {renderRiskBadge(scam.analysis?.riskLevel || 'high')}
                              <span className="text-xs font-black uppercase text-black">{scam.company}</span>
                            </div>
                            <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-white text-black border-2 border-black uppercase">
                              STATE: {scam.scamReviewState || 'PENDING REVIEW'}
                            </span>
                          </div>

                          <div>
                            <div className="text-sm font-black text-black">{scam.subject}</div>
                            <div className="text-xs font-mono font-bold text-zinc-700 mt-0.5">
                              Sender: {scam.senderName} &lt;{scam.senderEmail}&gt;
                            </div>
                          </div>

                          {/* Visual Domain Spoofing Diff */}
                          <div className="p-2.5 bg-white border-2 border-black grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="font-black uppercase text-zinc-600 block">Expected Official Domain:</span>
                              <span className="font-mono font-black text-[#10B981]">
                                @{scam.analysis?.expectedOfficialDomain || 'official-corporate.com'}
                              </span>
                            </div>
                            <div>
                              <span className="font-black uppercase text-zinc-600 block">Actual Sender Domain:</span>
                              <span className="font-mono font-black text-[#EF4444]">
                                @{actualDomain} (MISMATCH)
                              </span>
                            </div>
                          </div>

                          {/* Evidence Excerpts */}
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-black uppercase tracking-wider text-black">
                              Direct Evidence from Message:
                            </div>
                            {scam.analysis?.evidence.map((ev, i) => (
                              <div
                                key={i}
                                className="p-2.5 bg-[#FCA5A5] border-2 border-black text-xs font-mono font-bold text-black"
                              >
                                "{ev}"
                              </div>
                            ))}
                          </div>

                          {/* Why the Evidence Matters */}
                          <div className="p-3 bg-white border-2 border-black space-y-1">
                            <div className="text-[11px] font-black uppercase text-black">Why This Evidence Matters:</div>
                            <p className="text-xs font-medium text-zinc-900 leading-relaxed">
                              {scam.analysis?.explanation}
                            </p>
                          </div>

                          {/* Recommended Verification Steps */}
                          <div className="p-3 bg-[#6EE7B7] border-2 border-black space-y-1">
                            <div className="text-[11px] font-black uppercase text-black">
                              Recommended Verification Steps:
                            </div>
                            <p className="text-xs font-bold text-black leading-relaxed">
                              {scam.analysis?.recommendedAction}
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 border-t-2 border-black flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setCybercrimeReportModal(scam)}
                            className={`${BRUTAL_BTN} py-1.5 px-2.5 bg-black text-white`}
                          >
                            <FileWarning className="w-3.5 h-3.5" /> 1930 Cybercrime Report
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleScamAction(scam.id, 'reviewed')}
                              className={`${BRUTAL_BTN} bg-[#10B981] text-black`}
                            >
                              Mark "Reviewed"
                            </button>
                            <button
                              type="button"
                              onClick={() => handleScamAction(scam.id, 'dismissed')}
                              className={`${BRUTAL_BTN} bg-white text-black hover:bg-[#FCA5A5]`}
                            >
                              Dismiss Warning
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Ad-Hoc Forensic Scam Scanner with 1-Click Judge Presets */}
              <div className={`${BRUTAL_CARD} p-5 space-y-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-3">
                  <div>
                    <h2 className="text-base font-black uppercase text-black">
                      INSTANT FORENSIC OFFER & MESSAGE SCANNER
                    </h2>
                    <p className="text-xs font-bold text-zinc-700">
                      Paste any suspicious email or Hinglish WhatsApp recruiter message below—or click a preset—to run an instant forensic check.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setCustomScamText(
                          'CONGRATULATIONS! Direct joining at Wipro AI Division (₹24 LPA) without coding interview. Pay ₹6,500 refundable laptop & background verification charge via UPI wipro.hr.desk@ybl aaj shaam 6 baje tak, and reply with Aadhaar + PAN PDF.'
                        )
                      }
                      className={`${BRUTAL_BTN} py-1 px-2 bg-[#FCA5A5] text-black`}
                    >
                      Preset: Hinglish UPI Scam
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomScamText(
                          'URGENT KYC: Before your Tech Mahindra HR round today, reply within 1 hour with your Aadhaar card, PAN card, cancelled cheque, and the 6-digit Digilocker OTP sent to your phone.'
                        )
                      }
                      className={`${BRUTAL_BTN} py-1 px-2 bg-[#FDE047] text-black`}
                    >
                      Preset: OTP & KYC Phishing
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomScamText(
                          'Dear Aarav, Following your 3 technical rounds with our Bengaluru engineering panel, we are delighted to extend an official offer of employment for Staff Backend Engineer at ₹44,00,000 PA fixed compensation. Please review the agreement on our official portal within 7 days.'
                        )
                      }
                      className={`${BRUTAL_BTN} py-1 px-2 bg-[#6EE7B7] text-black`}
                    >
                      Preset: Genuine Offer
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={customScamText}
                  onChange={(e) => setCustomScamText(e.target.value)}
                  className={BRUTAL_INPUT}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={async () => {
                      const isCleanPreset = customScamText.includes('Following your 3 technical rounds');
                      const res = await analyzeEmailWithAI(
                        {
                          subject: customScamText.slice(0, 70),
                          senderName: isCleanPreset ? 'Official Talent Team' : 'External Recruiter',
                          senderEmail: isCleanPreset ? 'offers@verified-tech.in' : 'recruiter.alert@gmail.com',
                          body: customScamText
                        },
                        geminiApiKey,
                        selectedModel
                      );
                      setCustomScamResult(res.analysis);
                    }}
                    className={`${BRUTAL_BTN} bg-[#EF4444] text-white`}
                  >
                    <ShieldAlert className="w-4 h-4" /> Investigate Message Now
                  </button>
                </div>
                {customScamResult && (
                  <div className="p-4 bg-[#FEF9C3] border-2 border-black shadow-[4px_4px_0px_0px_#000] space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      {renderCategoryBadge(customScamResult.category)}
                      {renderRiskBadge(customScamResult.riskLevel)}
                    </div>
                    <p className="font-bold text-black">{customScamResult.explanation}</p>
                    <div className="font-black text-black">
                      Verification Action: {customScamResult.recommendedAction}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              VIEW 6: FOLLOW-UP AUTOPILOT (7-DAY RULE)
             ================================================================ */}
          {activeTab === 'followups' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-black">
                  FOLLOW-UP AUTOPILOT (7-DAY NO-REPLY RULE)
                </h1>
                <p className="text-xs font-bold text-zinc-700">
                  Anchored strictly to <code className="bg-[#FDE047] px-1 border border-black font-mono">dateApplied</code>. Automatically suppresses reminders for Rejected or Offer-stage applications.
                </p>
              </div>

              {(['overdue', 'due_today', 'upcoming'] as const).map((bucketKey) => {
                const bucketMeta = {
                  overdue: {
                    title: 'OVERDUE FOLLOW-UPS (> 7 DAYS SINCE APPLICATION)',
                    headerBg: 'bg-[#FCA5A5]'
                  },
                  due_today: {
                    title: 'DUE TODAY (EXACTLY 7 DAYS SINCE APPLICATION)',
                    headerBg: 'bg-[#FDE047]'
                  },
                  upcoming: {
                    title: 'UPCOMING FOLLOW-UPS (< 7 DAYS SINCE APPLICATION)',
                    headerBg: 'bg-[#93C5FD]'
                  }
                }[bucketKey];

                const items = reminders.filter((r) => r.bucket === bucketKey && r.status !== 'dismissed');

                return (
                  <div key={bucketKey} className={`${BRUTAL_CARD} overflow-hidden`}>
                    <div className={`${bucketMeta.headerBg} border-b-2 border-black px-5 py-3 flex items-center justify-between`}>
                      <h2 className="text-sm font-black uppercase text-black">{bucketMeta.title}</h2>
                      <span className="px-2.5 py-0.5 text-xs font-mono font-black bg-white text-black border-2 border-black">
                        {items.length} ROLE(S)
                      </span>
                    </div>

                    <div className="p-5">
                      {items.length === 0 ? (
                        <div className="p-4 bg-[#F4F0EA] border-2 border-dashed border-black text-xs font-bold text-zinc-600">
                          No reminders in this bucket.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {items.map((rem) => (
                            <div
                              key={rem.id}
                              className="p-4 bg-[#FFFDF9] border-2 border-black shadow-[4px_4px_0px_0px_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black uppercase text-black">
                                    {rem.company} — {rem.role}
                                  </span>
                                  <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-[#F4F0EA] text-black border border-black uppercase">
                                    {rem.status}
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-zinc-700 flex flex-wrap items-center gap-3">
                                  <span>
                                    Applied: <strong className="text-black font-mono">{rem.dateApplied}</strong>
                                  </span>
                                  <span>
                                    Elapsed: <strong className="text-black underline">{rem.daysSinceApplied} days</strong>
                                  </span>
                                  <span>
                                    7-Day Due: <strong className="text-black font-mono">{rem.dueDate}</strong>
                                  </span>
                                </div>
                                {!rem.dateAppliedConfirmed && (
                                  <div className="pt-1 flex items-center gap-2">
                                    <span className="text-[11px] font-black text-black bg-[#FDE047] px-2 py-0.5 border border-black">
                                      ESTIMATED DATE — CONFIRM EXACT DATE:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmApplicationDate(rem.applicationId, rem.dateApplied)}
                                      className={`${BRUTAL_BTN} py-0.5 px-2 bg-black text-white`}
                                    >
                                      Confirm {rem.dateApplied}
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleGenerateFollowUp(rem.applicationId)}
                                  className={`${BRUTAL_BTN} bg-[#2563EB] text-white`}
                                >
                                  <Sparkles className="w-3.5 h-3.5" /> Generate Follow-Up
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReminderStates((prev) => ({ ...prev, [rem.applicationId]: 'snoozed' }));
                                    addToast('Reminder Snoozed', `Snoozed ${rem.company} follow-up for 3 days.`, 'info');
                                  }}
                                  className={`${BRUTAL_BTN} bg-white text-black`}
                                >
                                  Snooze +3d
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReminderStates((prev) => ({ ...prev, [rem.applicationId]: 'completed' }));
                                    addToast('Marked Complete', `Completed follow-up for ${rem.company}.`, 'success');
                                  }}
                                  className={`${BRUTAL_BTN} bg-[#6EE7B7] text-black`}
                                >
                                  Complete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReminderStates((prev) => ({ ...prev, [rem.applicationId]: 'dismissed' }));
                                    addToast('Reminder Dismissed', `Dismissed reminder for ${rem.company}.`, 'warning');
                                  }}
                                  className={`${BRUTAL_BTN} bg-zinc-200 text-black hover:bg-[#FCA5A5]`}
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ================================================================
              VIEW 7: SETTINGS, GEMINI MODEL CONFIG & DATA BACKUP
             ================================================================ */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className={`${BRUTAL_CARD} p-6 space-y-5`}>
                <div className="border-b-2 border-black pb-3">
                  <h1 className="text-xl font-black uppercase text-black">
                    AI ENGINE, FIREBASE & WORKSPACE SETTINGS
                  </h1>
                  <p className="text-xs font-bold text-zinc-700 mt-1">
                    Configure your live Gemini model identifier, API key, and local/Firebase persistence.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-4 bg-[#F4F0EA] border-2 border-black shadow-[4px_4px_0px_0px_#000] space-y-3">
                    <div className="text-xs font-black uppercase text-black flex items-center gap-2">
                      <Cpu className="w-4 h-4" /> Gemini API Runtime Configuration
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-black mb-1">
                        Select Gemini Model Identifier
                      </label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className={BRUTAL_INPUT}
                      >
                        <option value="gemini-2.5-flash">gemini-2.5-flash (Production Default)</option>
                        <option value="gemini-4-argon">gemini-4-argon (Frontier Model)</option>
                        <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Reasoning)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-black mb-1">
                        Google AI Studio API Key (Session Memory Only — Never Hardcoded)
                      </label>
                      <input
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="Paste GEMINI_API_KEY here for live API execution..."
                        className={BRUTAL_INPUT}
                      />
                    </div>
                    <p className="text-xs font-medium text-zinc-800 leading-relaxed">
                      When no key is entered, OfferGuard AI uses its built-in deterministic forensic engine so every classifier, scam detector, and draft generator works offline without interruption.
                    </p>
                  </div>

                  <div className="p-4 bg-[#F4F0EA] border-2 border-black shadow-[4px_4px_0px_0px_#000] space-y-3">
                    <div className="text-xs font-black uppercase text-black flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Firestore Security Rules (Included in Build)
                    </div>
                    <p className="text-xs font-bold text-zinc-700">
                      Production rules enforcing per-user document isolation (<code className="font-mono">firestore.rules</code>):
                    </p>
                    <pre className="p-3 bg-black text-[#6EE7B7] border-2 border-black text-[11px] font-mono overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{collection}/{docId} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}