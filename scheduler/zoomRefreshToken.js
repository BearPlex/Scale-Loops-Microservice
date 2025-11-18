const supabase = require("../config/supabaseClient");
const { getValidZoomToken } = require("../services/zoomService");

/**
 * Fetches all mediators that have zoom data in the zoom table
 * @returns {Promise<Array>} Array of mediator IDs with zoom tokens
 */
async function getMediatorsWithZoomData() {
  try {
    const { data, error } = await supabase
      .from("zoom")
      .select("mediator_id, token, mediator:mediator_id(*)")
      .not("token", "is", null);

    if (error) {
      console.error(
        "[ZOOM_REFRESH_TOKEN] Error fetching mediators with zoom data:",
        error
      );
      return [];
    }

    if (!data || data.length === 0) {
      console.log("[ZOOM_REFRESH_TOKEN] No mediators found with zoom tokens");
      return [];
    }

    console.log(
      `[ZOOM_REFRESH_TOKEN] Found ${data.length} mediator(s) with zoom tokens`
    );
    return data;
  } catch (err) {
    console.error(
      "[ZOOM_REFRESH_TOKEN] Unexpected error fetching mediators:",
      err
    );
    return [];
  }
}

/**
 * Refreshes zoom tokens for all mediators that have zoom data
 * @returns {Promise<Object>} Summary of refresh results
 */
async function refreshZoomTokensForAllMediators() {
  const startTime = new Date();
  const summary = {
    totalMediators: 0,
    processedMediators: 0,
    successfulRefreshes: 0,
    failedRefreshes: 0,
    skippedMediators: 0,
    errors: [],
  };

  console.log(
    "[ZOOM_REFRESH_TOKEN] ===== ZOOM TOKEN REFRESH JOB STARTED ====="
  );
  console.log(`[ZOOM_REFRESH_TOKEN] Job started at ${startTime.toISOString()}`);

  try {
    const mediatorsWithZoom = await getMediatorsWithZoomData();
    summary.totalMediators = mediatorsWithZoom.length;

    if (mediatorsWithZoom.length === 0) {
      console.log("[ZOOM_REFRESH_TOKEN] No mediators to process, exiting");
      return summary;
    }

    for (const zoomRecord of mediatorsWithZoom) {
      const mediatorId = zoomRecord.mediator_id;
      const mediatorData = zoomRecord.mediator;

      if (!mediatorId) {
        console.warn(
          "[ZOOM_REFRESH_TOKEN] Skipping record with no mediator_id"
        );
        summary.skippedMediators++;
        continue;
      }

      try {
        console.log(`[ZOOM_REFRESH_TOKEN] Processing mediator: ${mediatorId}`);

        // Call getValidZoomToken which will check and refresh if needed
        const validToken = await getValidZoomToken(mediatorId);

        if (validToken) {
          console.log(
            `[ZOOM_REFRESH_TOKEN] ✅ Successfully validated/refreshed token for mediator: ${mediatorId}`
          );
          summary.successfulRefreshes++;
        } else {
          console.warn(
            `[ZOOM_REFRESH_TOKEN] ⚠️ No valid token returned for mediator: ${mediatorId}`
          );
          summary.failedRefreshes++;
          summary.errors.push({
            mediatorId,
            error: "No valid token returned",
          });
        }

        summary.processedMediators++;
      } catch (error) {
        console.error(
          `[ZOOM_REFRESH_TOKEN] ❌ Failed to refresh token for mediator ${mediatorData?.first_name} ${mediatorData?.last_name}:`,
          error.message
        );
        summary.failedRefreshes++;
        summary.processedMediators++;
        summary.errors.push({
          mediatorId,
          error: error.message || "Unknown error",
        });
      }
    }

    const endTime = new Date();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(
      "[ZOOM_REFRESH_TOKEN] ===== ZOOM TOKEN REFRESH JOB COMPLETED ====="
    );
    console.log(
      `[ZOOM_REFRESH_TOKEN] Job completed at ${endTime.toISOString()}`
    );
    console.log(`[ZOOM_REFRESH_TOKEN] Duration: ${duration}s`);
    console.log(
      `[ZOOM_REFRESH_TOKEN] Total mediators: ${summary.totalMediators}`
    );
    console.log(
      `[ZOOM_REFRESH_TOKEN] Processed: ${summary.processedMediators}`
    );
    console.log(
      `[ZOOM_REFRESH_TOKEN] Successful: ${summary.successfulRefreshes}`
    );
    console.log(`[ZOOM_REFRESH_TOKEN] Failed: ${summary.failedRefreshes}`);
    console.log(`[ZOOM_REFRESH_TOKEN] Skipped: ${summary.skippedMediators}`);

    if (summary.errors.length > 0) {
      console.error(
        `[ZOOM_REFRESH_TOKEN] Errors occurred:`,
        summary.errors.slice(0, 10)
      );
      if (summary.errors.length > 10) {
        console.error(
          `[ZOOM_REFRESH_TOKEN] ... and ${
            summary.errors.length - 10
          } more errors`
        );
      }
    }

    return summary;
  } catch (error) {
    console.error("[ZOOM_REFRESH_TOKEN] Critical error in refresh job:", error);
    summary.errors.push({
      critical: true,
      error: error.message || "Unknown critical error",
    });
    return summary;
  }
}

module.exports = {
  refreshZoomTokensForAllMediators,
};
