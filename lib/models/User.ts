import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    idp: { type: String, required: true, trim: true, uppercase: true, default: "LOCAL" },
    passwordHash: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ username: 1, idp: 1 }, { unique: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
