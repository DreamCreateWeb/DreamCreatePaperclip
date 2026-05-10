import type { IntakeSection } from "@/src/db/schema";

export const DEFAULT_INTAKE_SECTIONS: IntakeSection[] = [
  {
    key: "personal_info",
    title: "Personal Information",
    fields: [
      { key: "full_name", label: "Full name", type: "text", required: true },
      { key: "dob", label: "Date of birth", type: "date", required: true },
      {
        key: "address",
        label: "Home address",
        type: "textarea",
        placeholder: "Street, city, state, ZIP",
      },
      { key: "phone", label: "Phone number", type: "tel" },
      { key: "email", label: "Email address", type: "email", required: true },
    ],
  },
  {
    key: "insurance",
    title: "Insurance Information",
    fields: [
      {
        key: "insurance_provider",
        label: "Insurance provider",
        type: "text",
        placeholder: "e.g. Delta Dental",
      },
      {
        key: "member_id",
        label: "Member ID",
        type: "text",
        placeholder: "ID on your insurance card",
      },
      {
        key: "group_number",
        label: "Group number",
        type: "text",
        placeholder: "Group # on your insurance card",
      },
    ],
  },
  {
    key: "medical_history",
    title: "Medical History",
    fields: [
      {
        key: "conditions",
        label: "Do any of the following apply to you?",
        type: "checklist",
        options: [
          "Diabetes",
          "Heart disease",
          "High blood pressure",
          "Osteoporosis",
          "Bleeding disorder",
          "Asthma",
          "Kidney disease",
          "Liver disease",
          "Cancer / chemotherapy",
          "Pregnancy",
        ],
      },
      {
        key: "medications",
        label: "Current medications",
        type: "textarea",
        placeholder: "List any medications you currently take",
      },
      {
        key: "allergies",
        label: "Known allergies",
        type: "textarea",
        placeholder: "e.g. penicillin, latex, aspirin",
      },
    ],
  },
  {
    key: "consent",
    title: "Consent & Acknowledgements",
    fields: [
      {
        key: "hipaa_consent",
        label:
          "I acknowledge receipt of the Notice of Privacy Practices and consent to the use and disclosure of my health information as described therein (HIPAA).",
        type: "checkbox",
        required: true,
      },
      {
        key: "treatment_consent",
        label:
          "I consent to examination and treatment by the dental staff and authorize the release of information necessary for insurance claims.",
        type: "checkbox",
        required: true,
      },
    ],
  },
];
