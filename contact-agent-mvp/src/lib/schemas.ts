import { z } from "zod";

export const ProfileSchema = z.object({
  lastName: z.string().min(1, "姓は必須"),
  firstName: z.string().min(1, "名は必須"),
  email: z.string().email("メール形式が不正"),
  phone: z.string().optional(),
  department: z.string().optional(),
  website: z.string().url("URL形式が不正").optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
});

export const TemplateSchema = z.object({
  body: z.string().min(1, "本文は必須").max(2000, "長すぎます"),
});

export const SettingsSchema = z.object({
  dryRun: z.boolean().default(true),
  concurrency: z.number().min(1).max(8).default(3),
  timeoutSec: z.number().min(5).max(60).default(12),
  showBrowser: z.boolean().default(false),
  captcha: z.enum(["none","twocaptcha","anticaptcha","capsolver"]).default("none"),
});

export const PreflightSchema = z.object({
  datasetIds: z.array(z.string()).min(1, "データセットを選択してください"),
  template: TemplateSchema,
  profile: ProfileSchema,
  config: SettingsSchema,
  sampleCount: z.number().min(1).max(3).optional(),
});
