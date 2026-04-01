import mongoose from "mongoose";

const identityProviderSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, uppercase: true },
    displayName: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const IdentityProvider =
  mongoose.models.IdentityProvider ||
  mongoose.model("IdentityProvider", identityProviderSchema);

export default IdentityProvider;
