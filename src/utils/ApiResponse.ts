class ApiResponse {
  success(data: any, additionalResponse: Record<string, any> = {}) {
    return {
      success: true,
      data,
      ...additionalResponse,
    };
  }

  error(message: string, additionalResponse: Record<string, any> = {}) {
    return {
      success: false,
      error: message,
      ...additionalResponse,
    };
  }
}

export default ApiResponse;
