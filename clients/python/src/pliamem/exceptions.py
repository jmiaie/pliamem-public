class PliamemError(Exception):
    """Base exception for Pliamem client."""
    pass

class PliamemAPIError(PliamemError):
    """Raised when the Pliamem API returns an error."""
    pass
