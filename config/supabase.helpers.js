// Utility function to format a response object
const formatResponseObject = (
    error = false,
    errorMessage = "",
    data = null,
    count = 0
  ) => ({
    error,
    message: error ? errorMessage : "",
    data,
    count,
  });
  
  // Utility function to generate a human-readable error message
  const getErrorMessage = (error) => {
    console.log("error", error);
  
    if (error.code === "PGRST116") {
      return "No record found. The result contains 0 rows.";
    }
  
    if (error instanceof TypeError) {
      return "A type error occurred. Please check the input values.";
    }
  
    if (error instanceof ReferenceError) {
      return "A reference error occurred. Please ensure all variables are defined.";
    }
  
    if (error.message && error.message.includes("NetworkError")) {
      return "A network error occurred. Please check your internet connection.";
    }
  
    if (error.message && error.message.includes("timeout")) {
      return "The request timed out. Please try again.";
    }
  
    return error.message || "An unknown error occurred.";
  };
  
  // Function to format the response based on the presence of an error
  const formatResponse = (error, data, count) => {
    if (error) {
      const errorMessage = getErrorMessage(error);
      return formatResponseObject(true, errorMessage, null);
    }
    return formatResponseObject(false, "", data, count || 0);
  };
  
  // Main function to execute a database query or similar async operation
  const executeQuery = async (query) => {
    try {
      const { data, error, count } = await query;
      return formatResponse(error, data, count);
    } catch (error) {
      return formatResponse(error, null);
    }
  };
  
  // Export the function for use in other parts of the application
  module.exports = executeQuery;
  