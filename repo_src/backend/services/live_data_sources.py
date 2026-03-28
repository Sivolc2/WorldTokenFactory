"""
Live data sources for World Token Factory.
Free APIs that feed into the risk assessment pipeline.
Each function returns structured data that Nexla can ingest or agents can consume.

All Tier 1 APIs require no authentication.
All return dicts with a 'source', 'ok', and 'data' (or 'error') key.
"""

from __future__ import annotations

import httpx
from datetime import date, timedelta
from typing import Optional

# User-Agent required by NWS API (government policy — not an auth token)
_NWS_USER_AGENT = "(worldtokenfactory.com, risk@worldtokenfactory.com)"

# ---------------------------------------------------------------------------
# USGS Earthquake Catalog
# ---------------------------------------------------------------------------

async def fetch_usgs_earthquakes(
    lat: float,
    lng: float,
    radius_km: int = 200,
    days: int = 30,
    min_magnitude: float = 2.5,
) -> dict:
    """Recent earthquakes near a location from USGS.

    Source: https://earthquake.usgs.gov/fdsnws/event/1/
    Auth: None
    Returns GeoJSON FeatureCollection with magnitude, depth, place, time.
    """
    end = date.today()
    start = end - timedelta(days=days)

    params = {
        "format": "geojson",
        "latitude": lat,
        "longitude": lng,
        "maxradiuskm": radius_km,
        "starttime": start.isoformat(),
        "endtime": end.isoformat(),
        "minmagnitude": min_magnitude,
        "orderby": "magnitude",
        "limit": 100,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(
                "https://earthquake.usgs.gov/fdsnws/event/1/query",
                params=params,
            )
            r.raise_for_status()
            payload = r.json()
            features = payload.get("features", [])
            return {
                "source": "usgs_earthquakes",
                "ok": True,
                "count": len(features),
                "query": {"lat": lat, "lng": lng, "radius_km": radius_km, "days": days, "min_magnitude": min_magnitude},
                "data": features,
                "metadata": payload.get("metadata", {}),
            }
        except httpx.HTTPStatusError as e:
            return {"source": "usgs_earthquakes", "ok": False, "error": f"HTTP {e.response.status_code}"}
        except Exception as e:
            return {"source": "usgs_earthquakes", "ok": False, "error": str(e)}


async def fetch_usgs_earthquake_feed(severity: str = "significant_month") -> dict:
    """USGS real-time GeoJSON feed (no params required).

    Args:
        severity: One of 'significant_hour', 'significant_day', 'significant_week',
                  'significant_month', '4.5_month', '2.5_month', '1.0_month', 'all_month'.
    """
    url = f"https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/{severity}.geojson"
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(url)
            r.raise_for_status()
            payload = r.json()
            return {
                "source": "usgs_earthquake_feed",
                "ok": True,
                "feed": severity,
                "count": len(payload.get("features", [])),
                "data": payload,
            }
        except Exception as e:
            return {"source": "usgs_earthquake_feed", "ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# NASA EONET — Natural Event Tracker
# ---------------------------------------------------------------------------

async def fetch_nasa_eonet_events(
    category: str = "all",
    status: str = "open",
    days: int = 30,
    limit: int = 50,
) -> dict:
    """Active natural events from NASA EONET v3.

    Source: https://eonet.gsfc.nasa.gov/docs/v3
    Auth: None
    Returns events with geometry coordinates and category.

    Args:
        category: Comma-separated categories — 'wildfires', 'severeStorms', 'volcanoes',
                  'floods', 'drought', 'earthquakes', 'seaIce', or 'all'.
        status: 'open' (active), 'closed', or 'all'.
        days: Events from past N days.
        limit: Max events to return.
    """
    params: dict = {
        "status": status,
        "days": days,
        "limit": limit,
    }
    if category != "all":
        params["category"] = category

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(
                "https://eonet.gsfc.nasa.gov/api/v3/events",
                params=params,
            )
            r.raise_for_status()
            payload = r.json()
            events = payload.get("events", [])
            return {
                "source": "nasa_eonet",
                "ok": True,
                "count": len(events),
                "query": {"category": category, "status": status, "days": days},
                "data": events,
            }
        except httpx.HTTPStatusError as e:
            return {"source": "nasa_eonet", "ok": False, "error": f"HTTP {e.response.status_code}"}
        except Exception as e:
            return {"source": "nasa_eonet", "ok": False, "error": str(e)}


async def fetch_nasa_eonet_geojson(
    category: str = "all",
    status: str = "open",
    days: int = 30,
) -> dict:
    """NASA EONET events as GeoJSON (for direct Nexla geospatial connector)."""
    params: dict = {"status": status, "days": days}
    if category != "all":
        params["category"] = category

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(
                "https://eonet.gsfc.nasa.gov/api/v3/events/geojson",
                params=params,
            )
            r.raise_for_status()
            payload = r.json()
            return {
                "source": "nasa_eonet_geojson",
                "ok": True,
                "count": len(payload.get("features", [])),
                "data": payload,
            }
        except Exception as e:
            return {"source": "nasa_eonet_geojson", "ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# NWS / NOAA Weather Alerts
# ---------------------------------------------------------------------------

async def fetch_noaa_weather_alerts(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    state: Optional[str] = None,
    severity: str = "Extreme,Severe",
) -> dict:
    """Active weather alerts from NOAA NWS.

    Source: https://www.weather.gov/documentation/services-web-api
    Auth: None (User-Agent header required per government policy)
    Returns GeoJSON FeatureCollection of active alerts.

    Args:
        lat: Latitude for point-based lookup.
        lng: Longitude for point-based lookup (required with lat).
        state: Two-letter US state code (e.g. 'CA', 'TX'). Alternative to lat/lng.
        severity: Comma-separated severity levels: 'Extreme', 'Severe', 'Moderate', 'Minor'.
    """
    headers = {
        "User-Agent": _NWS_USER_AGENT,
        "Accept": "application/geo+json",
    }

    params: dict = {"status": "actual"}
    if lat is not None and lng is not None:
        params["point"] = f"{lat},{lng}"
    elif state:
        params["area"] = state.upper()

    if severity:
        params["severity"] = severity

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(
                "https://api.weather.gov/alerts/active",
                params=params,
                headers=headers,
            )
            r.raise_for_status()
            payload = r.json()
            features = payload.get("features", [])
            return {
                "source": "noaa_weather_alerts",
                "ok": True,
                "count": len(features),
                "query": {"lat": lat, "lng": lng, "state": state, "severity": severity},
                "data": features,
                "title": payload.get("title", ""),
                "updated": payload.get("updated", ""),
            }
        except httpx.HTTPStatusError as e:
            return {"source": "noaa_weather_alerts", "ok": False, "error": f"HTTP {e.response.status_code}"}
        except Exception as e:
            return {"source": "noaa_weather_alerts", "ok": False, "error": str(e)}


async def fetch_noaa_forecast_office(lat: float, lng: float) -> dict:
    """Get NWS forecast office + grid info for a lat/lng point.

    Returns the forecast office, gridX, gridY, and forecast URLs.
    Prerequisite step before fetching gridpoint forecasts.
    """
    headers = {"User-Agent": _NWS_USER_AGENT, "Accept": "application/json"}
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get(
                f"https://api.weather.gov/points/{lat},{lng}",
                headers=headers,
            )
            r.raise_for_status()
            props = r.json().get("properties", {})
            return {
                "source": "noaa_forecast_office",
                "ok": True,
                "data": {
                    "office": props.get("cwa"),
                    "gridX": props.get("gridX"),
                    "gridY": props.get("gridY"),
                    "forecast_url": props.get("forecast"),
                    "forecast_hourly_url": props.get("forecastHourly"),
                    "timezone": props.get("timeZone"),
                    "city": props.get("relativeLocation", {}).get("properties", {}).get("city"),
                    "state": props.get("relativeLocation", {}).get("properties", {}).get("state"),
                },
            }
        except Exception as e:
            return {"source": "noaa_forecast_office", "ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Open-Meteo — Historical Climate Data
# ---------------------------------------------------------------------------

async def fetch_open_meteo_climate(
    lat: float,
    lng: float,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    days_back: int = 365,
) -> dict:
    """Historical climate data from Open-Meteo (data back to 1940).

    Source: https://open-meteo.com/en/docs/historical-weather-api
    Auth: None
    Returns daily temperature extremes, precipitation, wind, and weather codes.

    Args:
        lat: Latitude (WGS84).
        lng: Longitude (WGS84).
        start_date: ISO 8601 start date (YYYY-MM-DD). Defaults to 1 year ago.
        end_date: ISO 8601 end date (YYYY-MM-DD). Defaults to yesterday.
        days_back: Days to look back (used if start_date not supplied).
    """
    if end_date is None:
        end = date.today() - timedelta(days=1)  # archive API has ~2 day lag
        end_date = end.isoformat()
    if start_date is None:
        start_date = (date.fromisoformat(end_date) - timedelta(days=days_back)).isoformat()

    params = {
        "latitude": lat,
        "longitude": lng,
        "start_date": start_date,
        "end_date": end_date,
        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
            "wind_speed_10m_max",
            "wind_gusts_10m_max",
            "weather_code",
        ]),
        "timezone": "auto",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            r = await client.get(
                "https://archive-api.open-meteo.com/v1/archive",
                params=params,
            )
            r.raise_for_status()
            payload = r.json()
            daily = payload.get("daily", {})

            # Compute summary stats for risk scoring
            precip = daily.get("precipitation_sum", [])
            temp_max = daily.get("temperature_2m_max", [])
            wind = daily.get("wind_speed_10m_max", [])
            precip_clean = [v for v in precip if v is not None]
            temp_clean = [v for v in temp_max if v is not None]
            wind_clean = [v for v in wind if v is not None]

            return {
                "source": "open_meteo_climate",
                "ok": True,
                "query": {"lat": lat, "lng": lng, "start_date": start_date, "end_date": end_date},
                "summary": {
                    "total_precip_mm": round(sum(precip_clean), 1) if precip_clean else None,
                    "max_daily_precip_mm": round(max(precip_clean), 1) if precip_clean else None,
                    "max_temp_c": round(max(temp_clean), 1) if temp_clean else None,
                    "min_temp_c": round(min(temp_clean), 1) if temp_clean else None,
                    "max_wind_kmh": round(max(wind_clean), 1) if wind_clean else None,
                    "days_with_precip": sum(1 for v in precip_clean if v > 1.0),
                },
                "data": daily,
                "timezone": payload.get("timezone"),
                "elevation_m": payload.get("elevation"),
            }
        except httpx.HTTPStatusError as e:
            return {"source": "open_meteo_climate", "ok": False, "error": f"HTTP {e.response.status_code}"}
        except Exception as e:
            return {"source": "open_meteo_climate", "ok": False, "error": str(e)}


async def fetch_open_meteo_forecast(lat: float, lng: float) -> dict:
    """7-day weather forecast from Open-Meteo.

    Auth: None. Returns hourly temperature, precipitation, and wind.
    """
    params = {
        "latitude": lat,
        "longitude": lng,
        "hourly": "temperature_2m,precipitation,windspeed_10m,weathercode",
        "forecast_days": 7,
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.get("https://api.open-meteo.com/v1/forecast", params=params)
            r.raise_for_status()
            return {"source": "open_meteo_forecast", "ok": True, "data": r.json()}
        except Exception as e:
            return {"source": "open_meteo_forecast", "ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# OpenFEMA — Disaster Declarations
# ---------------------------------------------------------------------------

async def fetch_fema_disaster_declarations(
    state: Optional[str] = None,
    incident_type: Optional[str] = None,
    limit: int = 100,
) -> dict:
    """FEMA disaster declarations from OpenFEMA.

    Source: https://www.fema.gov/about/openfema/api
    Auth: None
    Returns historical FEMA disaster declarations filterable by state and incident type.

    Args:
        state: Two-letter US state code (e.g. 'CA').
        incident_type: e.g. 'Flood', 'Hurricane', 'Fire', 'Tornado', 'Earthquake'.
        limit: Max records to return (default 100, max 1000).
    """
    filters = []
    if state:
        filters.append(f"state eq '{state.upper()}'")
    if incident_type:
        filters.append(f"incidentType eq '{incident_type}'")

    params: dict = {
        "$top": limit,
        "$orderby": "declarationDate desc",
        "$format": "json",
    }
    if filters:
        params["$filter"] = " and ".join(filters)

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            r = await client.get(
                "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries",
                params=params,
            )
            r.raise_for_status()
            payload = r.json()
            records = payload.get("DisasterDeclarationsSummaries", [])
            return {
                "source": "fema_disaster_declarations",
                "ok": True,
                "count": len(records),
                "query": {"state": state, "incident_type": incident_type},
                "data": records,
                "metadata": payload.get("metadata", {}),
            }
        except httpx.HTTPStatusError as e:
            return {"source": "fema_disaster_declarations", "ok": False, "error": f"HTTP {e.response.status_code}"}
        except Exception as e:
            return {"source": "fema_disaster_declarations", "ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# World Bank — Country Risk Indicators
# ---------------------------------------------------------------------------

async def fetch_worldbank_indicators(
    country_code: str,
    indicators: Optional[list[str]] = None,
    years: int = 5,
) -> dict:
    """World Bank governance and development indicators for a country.

    Source: https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
    Auth: None
    Returns time series of risk-relevant macroeconomic and governance indicators.

    Default indicators (World Governance Indicators + development):
        PV.EST   — Political Stability and Absence of Violence/Terrorism
        RL.EST   — Rule of Law
        GE.EST   — Government Effectiveness
        CC.EST   — Control of Corruption
        NY.GDP.PCAP.CD — GDP per Capita (USD)
        SP.POP.TOTL    — Population Total
    """
    if indicators is None:
        indicators = [
            "PV.EST",    # Political Stability
            "RL.EST",    # Rule of Law
            "GE.EST",    # Government Effectiveness
            "CC.EST",    # Control of Corruption
            "NY.GDP.PCAP.CD",  # GDP per Capita
            "SP.POP.TOTL",     # Population
        ]

    results = {}
    async with httpx.AsyncClient(timeout=15) as client:
        for indicator in indicators:
            try:
                r = await client.get(
                    f"https://api.worldbank.org/v2/country/{country_code}/indicator/{indicator}",
                    params={"format": "json", "mrv": years, "per_page": years},
                )
                if r.status_code == 200:
                    data = r.json()
                    # World Bank returns [metadata, [records]]
                    records = data[1] if isinstance(data, list) and len(data) > 1 else []
                    results[indicator] = {
                        "ok": True,
                        "values": [
                            {"year": rec.get("date"), "value": rec.get("value")}
                            for rec in (records or [])
                        ],
                    }
                else:
                    results[indicator] = {"ok": False, "error": f"HTTP {r.status_code}"}
            except Exception as e:
                results[indicator] = {"ok": False, "error": str(e)}

    return {
        "source": "worldbank_indicators",
        "ok": True,
        "country": country_code.upper(),
        "data": results,
    }


# ---------------------------------------------------------------------------
# STAC — Sentinel-2 Satellite Image Catalog
# ---------------------------------------------------------------------------

async def fetch_stac_sentinel2(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 10,
    max_cloud_cover: Optional[float] = None,
) -> dict:
    """Sentinel-2 satellite image metadata from AWS Earth Search STAC.

    Source: https://earth-search.aws.element84.com/v1
    Auth: None
    Returns GeoJSON FeatureCollection of available satellite scenes.

    Args:
        min_lon, min_lat, max_lon, max_lat: Bounding box.
        start_date, end_date: ISO 8601 date strings (YYYY-MM-DD).
        limit: Max items to return.
        max_cloud_cover: Filter by cloud cover percentage (0-100).
    """
    if end_date is None:
        end_date = date.today().isoformat()
    if start_date is None:
        start_date = (date.today() - timedelta(days=90)).isoformat()

    params: dict = {
        "bbox": f"{min_lon},{min_lat},{max_lon},{max_lat}",
        "datetime": f"{start_date}T00:00:00Z/{end_date}T23:59:59Z",
        "limit": limit,
    }
    if max_cloud_cover is not None:
        params["query"] = f'{{"eo:cloud_cover":{{"lt":{max_cloud_cover}}}}}'

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            r = await client.get(
                "https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items",
                params=params,
            )
            r.raise_for_status()
            payload = r.json()
            features = payload.get("features", [])
            return {
                "source": "stac_sentinel2",
                "ok": True,
                "count": len(features),
                "query": {
                    "bbox": [min_lon, min_lat, max_lon, max_lat],
                    "start_date": start_date,
                    "end_date": end_date,
                    "max_cloud_cover": max_cloud_cover,
                },
                "data": features,
                "context": payload.get("context", {}),
            }
        except httpx.HTTPStatusError as e:
            return {"source": "stac_sentinel2", "ok": False, "error": f"HTTP {e.response.status_code}"}
        except Exception as e:
            return {"source": "stac_sentinel2", "ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Convenience: fetch all risk signals for a location
# ---------------------------------------------------------------------------

async def fetch_all_location_risk(
    lat: float,
    lng: float,
    country_code: str = "US",
    state: Optional[str] = None,
) -> dict:
    """Aggregate all available risk signals for a lat/lng location.

    Fires all data sources in parallel and returns a consolidated payload.
    Failures are non-fatal — each source reports its own ok/error status.
    """
    import asyncio

    bbox_delta = 0.5  # ~55km bounding box for satellite query
    tasks = {
        "earthquakes": fetch_usgs_earthquakes(lat, lng, radius_km=200, days=90),
        "natural_events": fetch_nasa_eonet_events(status="open", days=30),
        "weather_alerts": fetch_noaa_weather_alerts(lat=lat, lng=lng, severity="Extreme,Severe,Moderate"),
        "climate": fetch_open_meteo_climate(lat, lng, days_back=365),
        "forecast": fetch_open_meteo_forecast(lat, lng),
        "fema_disasters": fetch_fema_disaster_declarations(state=state) if state else None,
        "country_risk": fetch_worldbank_indicators(country_code, years=3),
        "satellite": fetch_stac_sentinel2(
            lng - bbox_delta, lat - bbox_delta,
            lng + bbox_delta, lat + bbox_delta,
            limit=5, max_cloud_cover=20,
        ),
    }

    # Run non-None tasks concurrently
    live_tasks = {k: v for k, v in tasks.items() if v is not None}
    results_list = await asyncio.gather(*live_tasks.values(), return_exceptions=True)
    results = {}
    for key, result in zip(live_tasks.keys(), results_list):
        if isinstance(result, Exception):
            results[key] = {"source": key, "ok": False, "error": str(result)}
        else:
            results[key] = result

    if state is None:
        results["fema_disasters"] = {"source": "fema_disasters", "ok": False, "error": "No US state provided — skipped"}

    return {
        "ok": True,
        "query": {"lat": lat, "lng": lng, "country_code": country_code, "state": state},
        "sources": results,
    }
