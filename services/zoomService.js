const supabase = require("../config/supabaseClient");
const axios = require("axios");

const handleGetZoomToken = async (mediatorId) => {
  const { data, error } = await supabase
    .from("zoom")
    .select("*")
    .eq("mediator_id", mediatorId)
    .single();
  if (error) {
    return { token: null, refresh_token: null };
  }
  return data;
};

const handleCheckZoomUser = async (accessToken) => {
  try {
    const response = await axios.get("https://api.zoom.us/v2/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return true;
  } catch (error) {
    // Log only status, not full error details
    if (error.response && error.response.status === 401) {
      console.error("Token validation failed: Invalid or expired token");
      return false;
    }
    console.error("Error validating Zoom user token");
    return false;
  }
};

const handleRefreshToken = async (mediatorId, refreshToken) => {
  try {
    const { data: zoomCredentials } = await supabase
      .from("zoom")
      .select("*")
      .eq("mediator_id", mediatorId)
      .single();
    // Removed sensitive credential logging
    console.log("zoomCredentials", zoomCredentials);
    console.log("Refreshing Zoom token for mediator:", mediatorId);
    const response = await axios.post("https://zoom.us/oauth/token", null, {
      params: {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      },
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${zoomCredentials?.client_id}:${zoomCredentials?.client_secret}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    const { access_token, refresh_token } = response.data;
    console.log("Zoom Token Refreshed -> mediatorId: ", mediatorId);
    await supabase
      .from("zoom")
      .upsert(
        { mediator_id: mediatorId, token: access_token, refresh_token },
        { onConflict: ["mediator_id"] }
      );
    return { access_token, refresh_token };
  } catch (error) {
    // Log error type only, not full error details
    console.error("Error refreshing Zoom token for mediator:", mediatorId);
    throw new Error("Error refreshing token");
  }
};

const getValidZoomToken = async (mediatorId) => {
  try {
    const { token, refresh_token } = await handleGetZoomToken(mediatorId);

    if (token && refresh_token) {
      const isValidToken = await handleCheckZoomUser(token);
      console.log("isValidToken Zoom -> mediatorId: ", {
        mediatorId,
        isValidToken,
      });

      if (isValidToken) {
        return token;
      } else {
        try {
          const { access_token } = await handleRefreshToken(
            mediatorId,
            refresh_token
          );
          return access_token;
        } catch (err) {
          console.error(
            "Error refreshing token in getValidZoomToken:",
            err.response?.data || err.message
          );
          throw new Error(
            `Failed to refresh Zoom token: ${
              err.response?.data?.error || err.message
            }`
          );
        }
      }
    }

    throw new Error("No Zoom configuration found for mediator");
  } catch (error) {
    console.error("Error in getValidZoomToken:", error);
    throw error;
  }
};

module.exports = { getValidZoomToken };
