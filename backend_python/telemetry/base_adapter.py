"""
Abstract Base Adapter for telemetry data sources.
Each game must implement a concrete adapter that inherits from this class.
"""

from abc import ABC, abstractmethod
from .universal_model import UniversalTelemetry


class BaseTelemetryAdapter(ABC):
    """Base class for all game telemetry adapters."""

    @abstractmethod
    def get_port(self) -> int:
        """Return the UDP port this adapter listens on."""
        ...

    @abstractmethod
    def parse_packet(self, data: bytes) -> UniversalTelemetry:
        """
        Parse a raw UDP byte packet into the universal telemetry model.
        
        Args:
            data: Raw bytes received from UDP socket.
            
        Returns:
            UniversalTelemetry instance with normalized values.
        """
        ...

    @abstractmethod
    def get_game_name(self) -> str:
        """Return human-readable game name for display."""
        ...
