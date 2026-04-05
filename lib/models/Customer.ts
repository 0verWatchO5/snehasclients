import mongoose from "mongoose";

const policyHolderNameSchema = new mongoose.Schema(
  {
    first: { type: String, required: true, trim: true },
    mid: { type: String, trim: true, default: "" },
    surname: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const emiSchema = new mongoose.Schema(
  {
    status: { type: Boolean, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    phn: { type: policyHolderNameSchema, alias: "policyHolderName", required: true },
    a: { type: Number, alias: "age", required: true, min: 0 },
    mob: { type: String, alias: "mobileNumber", required: true, trim: true },
    w: { type: Number, alias: "weight", required: true, min: 0 },
    h: { type: Number, alias: "height", required: true, min: 0 },
    pn: {
      type: String,
      alias: "policyNumber",
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    sa: { type: Number, alias: "sumAssured", required: true, min: 0 },
    pa: { type: Number, alias: "premiumAmount", required: true, min: 0 },
    pt: { type: Number, alias: "policyTerm", required: true, min: 0 },
    e: { type: emiSchema, alias: "emi", required: true },
    pr: {
      type: String,
      alias: "provider",
      required: true,
      enum: ["STAR", "LIC"],
    },
    dob: { type: Date, alias: "dateOfBirth", required: true },
    pm: { type: String, alias: "premiumMode", required: true, enum: ["M", "Q", "A", "L"] },
    cc: {
      type: String,
      alias: "customerCode",
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    sd: { type: Date, alias: "startDate", required: true },
    ed: { type: Date, alias: "endDate", required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

customerSchema.index(
  {
    "phn.first": "text",
    "phn.mid": "text",
    "phn.surname": "text",
  },
  { name: "policy_holder_name_text_idx" }
);

const Customer = mongoose.models.Customer || mongoose.model("Customer", customerSchema);

export default Customer;
