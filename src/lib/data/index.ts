import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import * as sample from "./sample-store";
import * as database from "./supabase-store";

// The only way pages read or write data. Uses the database when it is connected,
// and in-memory sample data otherwise (local development, tests, previews without keys).
const store = isSupabaseConfigured ? database : sample;

export const usingDatabase = isSupabaseConfigured;
export const listCauses = store.listCauses;
export const getCause = store.getCause;
export const getChannelForCause = store.getChannelForCause;
export const getCauseProgress = store.getCauseProgress;
export const recordGift = store.recordGift;
export const recordPledge = store.recordPledge;
export const getReceipt = store.getReceipt;
export const listCausePhotos = store.listCausePhotos;
export const getCoverPhotos = store.getCoverPhotos;
export const getSitePhotos = store.getSitePhotos;
export const getChairVideoId = store.getChairVideoId;
export const listNews = store.listNews;
export const getNewsPost = store.getNewsPost;
export { GivingError } from "./sample-store";
