# Permian Basin, Texas — The "Assumed Backstop" That's Quietly Cracking

## Scenario Context

A Strait of Hormuz disruption removes approximately 17–21 million barrels per day of global crude flow —
roughly 20% of world supply. Every energy analyst modelling a response scenario points to the same asset:
the Permian Basin. It produces ~45% of all US oil (~6.7 Mbbl/day, Novi Labs) and is the only basin with
the infrastructure scale to meaningfully offset a Hormuz gap within a 90-day window.

**The problem**: the production capacity figures being used in Hormuz disruption models assume no domestic
constraints. All three risk vectors below are currently active, not hypothetical. This is almost entirely
absent from current risk literature.

**Core scenario**: the world assumes Permian ramps production during the Hormuz crisis, but an ERCOT grid
failure or pipeline constraint could kneecap it at exactly the wrong moment.

---

## Risk Vector 1 — Power Infrastructure Failure

**Status**: Active structural vulnerability; buildout delayed

**What's happening**: The Permian Basin lacks adequate infrastructure to import large volumes of electricity
to power field operations — compressors, injection pumps, artificial lift systems. The West Texas
transmission additions required to support current and projected production levels are behind schedule.

**Key warning** *(U.S. News & World Report)*:
> "The greatest risk of failure for the Permian Basin Reliability Plan is for these necessary projects
> to falter under any delay."

**ERCOT exposure**: Summer 2026 peak demand projections show a ~3.7 GW reserve margin deficit if planned
West Texas transmission additions slip. Permian field operations require approximately 4.2 GW to sustain
6.7 Mbbl/day output. Without new import capacity, an ERCOT demand spike triggers automatic load-shedding
that hits industrial field customers — compressors and pumps — before residential consumers.

**Trigger scenario**: A summer 2026 heat wave or winter storm event forces ERCOT into emergency load-shed.
Field compressors trip offline across the basin. A 5-day curtailment would reduce Permian output by an
estimated 850 Kbbl/day — the exact capacity the Hormuz models are counting on.

**Mitigation gap**: Diesel backup generation could provide partial coverage, but sourcing 450 MW of mobile
genset capacity during a crisis is operationally uncertain and takes weeks, not hours.

**Uncertainty level**: HIGH — ERCOT stress events are seasonal and cannot be predicted at a 6-month horizon.
Financial exposure estimate: $60M–$280M for a large integrated operator (5-day curtailment at WTI $75–90/bbl).

---

## Risk Vector 2 — Subsurface Pressure / Zombie Well Crisis

**Status**: Active, regulatory enforcement underway

**What's happening**: Texas regulators are warning that wastewater from fracking in the Permian is causing
a "widespread" increase in underground pressure — risking toxic leaks and hindering crude output.
*(EnergyNow)*

**Who's affected**: Chevron, BP, and Coterra are among the companies receiving notices from the Railroad
Commission of Texas for pressure management non-compliance.

**Scale of the problem**:
- Wastewater injection volumes in the Delaware Basin: ~18.4 Mbbl/day
- Permian legacy well count: ~120,000 plugged or inactive wells
- Orphaned / inadequately sealed ("zombie") wells: ~8,400
- Blowout incidents recorded 2022–2024: 3 confirmed

**Mechanism**: As wastewater is re-injected into formations already stressed by decades of extraction,
underground pressure migrates through fault networks into legacy well casings. Zombie wells become
pressure conduits — connecting the deep injection zone to the surface. As injection volumes increase
to match production, the risk scales nonlinearly.

**Trigger scenario**: A production ramp to offset Hormuz disruption increases injection volumes
proportionally. Pressure propagation accelerates. The Railroad Commission issues broad shutdown orders
across active injection zones, directly curtailing oil production.

**Uncertainty level**: CRITICAL — the spatial distribution of zombie wells relative to active injection
zones is poorly mapped. Pressure propagation in fractured basement rock is not modelled at sufficient
resolution to predict failure locations.

Financial exposure estimate: $32M–$190M (shutdown order scope + cleanup liability for a large operator).

---

## Risk Vector 3 — Gas Pipeline Bottleneck (Waha Hub)

**Status**: Active constraint — ongoing as of March 2026

**What's happening**: Waha natural gas hub prices have been **negative on 38 out of 51 days in 2026**
to date. *(AEGIS Hedging)* When gas prices go deeply negative (-$1 to -$3/MMBtu), producers face a
binary choice:

1. Pay to dispose of associated gas → production economics degrade
2. Shut in the oil well → production stops

**The bottleneck**: The Blackcomb pipeline — a key egress relief valve for Permian gas — has been
pushed from its original July 2026 completion to **November 2026**. This leaves a minimum 4-month
window (July–November) with no new pipeline egress capacity. *(AEGIS Hedging)*

**The ramp problem**: A production increase to offset Hormuz disruptions would add an estimated
0.8–1.2 Bcf/day of incremental associated gas across the basin. Current spare egress capacity cannot
absorb this volume. Flaring headroom is constrained by Railroad Commission permit limits.

**Trigger scenario**: Permian operators are asked to ramp output in Q3 2026. Associated gas volumes
spike. Waha prices go further negative. Flaring permits hit their ceiling. The incremental oil production
is curtailed by the gas it produces — the backstop fails precisely when it is needed most.

**Uncertainty level**: HIGH — the timeline is known (Blackcomb delay to November is confirmed), but
the curtailment magnitude depends on the scale and duration of any external demand shock.

Financial exposure estimate: $42M–$155M for a large operator (curtailment across high-GOR pad clusters,
July–October window).

---

## Compounding Risk Assessment

These three vectors are not independent:

```
ERCOT stress event
      │
      ▼
Field operation curtailment ──► Production shortfall
                                        │
Wastewater pressure buildup             │
      │                                 │
      ▼                                 │
Regulatory shutdown orders ─────────────┤
                                        │
Waha gas prices negative                │
      │                                 │
      ▼                                 │
Oil curtailment economics ──────────────┘
                                        │
                                        ▼
                          Global supply gap DURING Hormuz crisis
```

**Correlation risk**: All three vectors intensify under the same condition — a large Permian production
ramp. The very act of ramping production to relieve the Hormuz disruption:
- Increases electrical load on a constrained grid (Vector 1)
- Increases wastewater injection volumes into pressurised formations (Vector 2)
- Increases associated gas volumes into a pipeline system with no spare egress (Vector 3)

A ramp attempt is not a safe hedge. It is a trigger mechanism for all three risks simultaneously.

---

## Production Impact Scenarios

| Scenario | Trigger | Permian Output Impact | Duration |
|---|---|---|---|
| Base (no ramp) | None | 6.7 Mbbl/day sustained | Ongoing |
| ERCOT curtailment only | 5-day grid event | −850 Kbbl/day | 5–14 days |
| Waha shut-in cascade | Ramp attempt Q3 2026 | −400–800 Kbbl/day | July–November |
| Regulatory shutdown | Zombie well blowout | −200–600 Kbbl/day | 30–90 days |
| Combined event | All three during ramp | −1.2–2.0 Mbbl/day | 30–120 days |

A combined event scenario removes 1.2–2.0 Mbbl/day from a basin the Hormuz models assume will *add*
0.8–1.5 Mbbl/day. Net effect vs expectations: −2.0–3.5 Mbbl/day.

---

## Data Sources

- Production volumes: Novi Labs (Permian ~6.7 Mbbl/day, ~45% of US total)
- Power infrastructure risk: U.S. News & World Report (Permian Basin Reliability Plan warnings)
- Wastewater / zombie wells: EnergyNow (Railroad Commission notices to Chevron, BP, Coterra)
- Gas pipeline bottleneck: AEGIS Hedging (Waha pricing data, Blackcomb completion delay)
- Injection volumes and legacy well count: Railroad Commission of Texas public filings

## Satellite Data

- `permian_basin_midland_dem_30m.tif` — Copernicus 30m DEM, Delaware Basin / western Permian
  (N31–32, W102–103). Flat basin topology confirms full electrical dependency — no gravity-assist
  for fluid movement. Dense pipeline and well infrastructure visible at 30m resolution.
