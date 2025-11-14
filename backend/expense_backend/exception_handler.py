from rest_framework.views import exception_handler
from rest_framework.response import Response
import logging

logger = logging.getLogger('ledger')

def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Log the error
    logger.error(f'Exception occurred: {str(exc)}', exc_info=True, extra={'context': context})
    
    # If response is None, it means DRF couldn't handle it
    # Return a generic error response
    if response is None:
        return Response(
            {'error': 'An error occurred processing your request', 'detail': str(exc)},
            status=500
        )
    
    # Customize the response data
    custom_response_data = {
        'error': 'An error occurred',
        'detail': response.data if isinstance(response.data, dict) else str(response.data)
    }
    
    response.data = custom_response_data
    return response

