import type { PostgrestError } from "@supabase/supabase-js";

export type ApiResponse<T> = {
  data: T | null;
  error: { message: string; original?: PostgrestError } | null;
};

/**
 * Standardizes API responses and provides base error handling/logging.
 */
export async function handleApiResponse<T>(
  promise: Promise<{ data: T | null; error: PostgrestError | null }>
): Promise<ApiResponse<T>> {
  try {
    const { data, error } = await promise;
    if (error) {
      console.error("[API Error]", error.message, error.details, error.hint);
      return { 
        data: null, 
        error: { 
          message: error.message || "A database error occurred.", 
          original: error 
        } 
      };
    }
    return { data, error: null };
  } catch (err: any) {
    console.error("[Unexpected API Error]", err);
    return { 
      data: null, 
      error: { 
        message: "A network or unexpected error occurred. Please try again." 
      } 
    };
  }
}
