"""
Live data API routes for World Token Factory.
Wraps free public APIs (USGS, NASA EONET, NOAA NWS, Open-Meteo, OpenFEMA,
World Bank, STAC) as FastAPI endpoints for the risk assessment pipeline.
"""

from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter(prefix="/api/live-data", tags=["live-data"])


# ---------------------------------------------------------------------------
# USGS Earthquakes
# ---------------------------------------------------------------------------

@router.get("/earthquakes")
async def get_earthquakes(
    lat: float = Query(..., description="Latitude of target location"),
    lng: float = Query(..., description="Longitude of target location"),
    radius_km: int = Query(200, description="Search radius in kilometers"),
    days: int = Query(30, description="Number of past days to search"),
    min_magnitude: float = Query(2.5, description="Minimum earthquake magnitude"),
):
    """Recent earthquakes near a lat/lng location from USGS.

    Returns GeoJSON features with magnitude, depth, place, and time.
    No authentication required.
    """
    from repo_src.backend.services.live_data_sources import fetch_usgs_earthquakes
    return await fetch_usgs_earthquakes(lat, lng, radius_km, days, min_magnitude)


@router.get("/earthquakes/feed")
async def get_earthquake_feed(
    severity: str = Query("significant_month", description="Feed type: significant_month, 4.5_month, 2.5_month, all_month, significant_week, etc."),
):
    """USGS real-time earthquake feed. No params required — returns preset global feeds."""
    from repo_src.backend.services.live_data_sources import fetch_usgs_earthquake_feed
    return await fetch_usgs_earthquake_feed(severity)


# ---------------------------------------------------------------------------
# NASA EONET Natural Events
# ---------------------------------------------------------------------------

@router.get("/natural-events")
async def get_natural_events(
    category: str = Query("all", description="Event category: wildfires, severeStorms, volcanoes, floods, drought, earthquakes, seaIce, or 'all'"),
    status: str = Query("open", description="Event status: open (active), closed, or all"),
    days: int = Query(30, description="Events from the past N days"),
    limit: int = Query(50, description="Maximum events to return"),
):
    """Active natural disaster events from NASA EONET v3.

    Categories map directly to risk types in the World Token Factory scoring model.
    No authentication required.
    """
    from repo_src.backend.services.live_data_sources import fetch_nasa_eonet_events
    return await fetch_nasa_eonet_events(category, status, days, limit)


@router.get("/natural-events/geojson")
async def get_natural_events_geojson(
    category: str = Query("all", description="Event category filter"),
    status: str = Query("open", description="open, closed, or all"),
    days: int = Query(30, description="Past N days"),
):
    """NASA EONET events as GeoJSON FeatureCollection (for Nexla geospatial connector)."""
    from repo_src.backend.services.live_data_sources import fetch_nasa_eonet_geojson
    return await fetch_nasa_eonet_geojson(category, status, days)


# ---------------------------------------------------------------------------
# NOAA / NWS Weather Alerts
# ---------------------------------------------------------------------------

@router.get("/weather-alerts")
async def get_weather_alerts(
    lat: Optional[float] = Query(None, description="Latitude (use with lng for point-based lookup)"),
    lng: Optional[float] = Query(None, description="Longitude (use with lat for point-based lookup)"),
    state: Optional[str] = Query(None, description="Two-letter US state code (e.g. CA, TX) — alternative to lat/lng"),
    severity: str = Query("Extreme,Severe", description="Comma-separated severity levels: Extreme, Severe, Moderate, Minor"),
):
    """Active NWS/NOAA weather alerts.

    Provide either lat+lng (point-based) or state (state-wide).
    No authentication required — returns GeoJSON features.
    """
    from repo_src.backend.services.live_data_sources import fetch_noaa_weather_alerts
    return await fetch_noaa_weather_alerts(lat, lng, state, severity)


@router.get("/weather-alerts/forecast-office")
async def get_forecast_office(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
):
    """Get NWS forecast office and grid info for a lat/lng point.

    Returns office code, gridX/gridY, and forecast URLs.
    Prerequisite for fetching gridpoint forecasts.
    """
    from repo_src.backend.services.live_data_sources import fetch_noaa_forecast_office
    return await fetch_noaa_forecast_office(lat, lng)


# ---------------------------------------------------------------------------
# Open-Meteo Historical Climate + Forecast
# ---------------------------------------------------------------------------

@router.get("/climate")
async def get_climate(
    lat: float = Query(..., description="Latitude (WGS84)"),
    lng: float = Query(..., description="Longitude (WGS84)"),
    start_date: Optional[str] = Query(None, description="ISO 8601 start date YYYY-MM-DD (defaults to 1 year ago)"),
    end_date: Optional[str] = Query(None, description="ISO 8601 end date YYYY-MM-DD (defaults to yesterday)"),
    days_back: int = Query(365, description="Days to look back if start_date not provided"),
):
    """Historical climate data from Open-Meteo (data available back to 1940).

    Returns daily temperature extremes, precipitation totals, wind speed, and
    derived summary stats for risk scoring. No authentication required.
    """
    from repo_src.backend.services.live_data_sources import fetch_open_meteo_climate
    return await fetch_open_meteo_climate(lat, lng, start_date, end_date, days_back)


@router.get("/forecast")
async def get_forecast(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
):
    """7-day weather forecast from Open-Meteo. No authentication required."""
    from repo_src.backend.services.live_data_sources import fetch_open_meteo_forecast
    return await fetch_open_meteo_forecast(lat, lng)


# ---------------------------------------------------------------------------
# OpenFEMA Disaster Declarations
# ---------------------------------------------------------------------------

@router.get("/fema-disasters")
async def get_fema_disasters(
    state: Optional[str] = Query(None, description="Two-letter US state code (e.g. CA, TX)"),
    incident_type: Optional[str] = Query(None, description="Incident type: Flood, Hurricane, Fire, Tornado, Earthquake, etc."),
    limit: int = Query(100, description="Max records to return (default 100, max 1000)"),
):
    """FEMA disaster declarations from OpenFEMA.

    Historical record of federally declared disasters by state and incident type.
    No authentication required. Useful for insurance and credit risk scoring.
    """
    from repo_src.backend.services.live_data_sources import fetch_fema_disaster_declarations
    return await fetch_fema_disaster_declarations(state, incident_type, limit)


# ---------------------------------------------------------------------------
# World Bank Country Risk Indicators
# ---------------------------------------------------------------------------

@router.get("/country-risk")
async def get_country_risk(
    country_code: str = Query(..., description="ISO 2-letter country code (e.g. US, DE, CN, BR)"),
    years: int = Query(5, description="Number of most recent years to return"),
):
    """World Bank governance and development indicators for a country.

    Returns Political Stability, Rule of Law, Government Effectiveness,
    Control of Corruption, GDP per Capita, and Population.
    No authentication required.
    """
    from repo_src.backend.services.live_data_sources import fetch_worldbank_indicators
    return await fetch_worldbank_indicators(country_code, years=years)


# ---------------------------------------------------------------------------
# STAC Sentinel-2 Satellite Imagery Metadata
# ---------------------------------------------------------------------------

@router.get("/satellite")
async def get_satellite_imagery(
    min_lon: float = Query(..., description="Bounding box minimum longitude"),
    min_lat: float = Query(..., description="Bounding box minimum latitude"),
    max_lon: float = Query(..., description="Bounding box maximum longitude"),
    max_lat: float = Query(..., description="Bounding box maximum latitude"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD (defaults to 90 days ago)"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD (defaults to today)"),
    limit: int = Query(10, description="Max satellite scenes to return"),
    max_cloud_cover: Optional[float] = Query(None, description="Max cloud cover percentage (0-100)"),
):
    """Sentinel-2 satellite image metadata from AWS Earth Search STAC.

    Returns available scenes with acquisition date, cloud cover, and band URLs.
    No authentication required.
    """
    from repo_src.backend.services.live_data_sources import fetch_stac_sentinel2
    return await fetch_stac_sentinel2(min_lon, min_lat, max_lon, max_lat, start_date, end_date, limit, max_cloud_cover)


# ---------------------------------------------------------------------------
# Aggregate Risk Snapshot
# ---------------------------------------------------------------------------

@router.get("/risk-snapshot")
async def get_risk_snapshot(
    lat: float = Query(..., description="Latitude of target location"),
    lng: float = Query(..., description="Longitude of target location"),
    country_code: str = Query("US", description="ISO 2-letter country code for World Bank indicators"),
    state: Optional[str] = Query(None, description="Two-letter US state code for FEMA lookup"),
):
    """Aggregate all live risk signals for a location in a single call.

    Fires all data sources in parallel and returns a consolidated risk payload:
    - USGS earthquakes (past 90 days, 200km radius)
    - NASA EONET active natural events
    - NOAA weather alerts (Extreme + Severe + Moderate)
    - Open-Meteo climate summary (past year)
    - Open-Meteo 7-day forecast
    - OpenFEMA disaster declarations (if US state provided)
    - World Bank country indicators (past 3 years)
    - Sentinel-2 satellite scenes (past 90 days, low cloud cover)

    Individual source failures are non-fatal — each reports its own ok/error status.
    """
    from repo_src.backend.services.live_data_sources import fetch_all_location_risk
    return await fetch_all_location_risk(lat, lng, country_code, state)
