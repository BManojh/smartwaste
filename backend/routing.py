from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from typing import Iterable


@dataclass
class BinPoint:
    bin_id: str
    x: float
    y: float
    fill: int


@dataclass
class RouteResult:
    selected_bins: list[BinPoint]
    route: list[str]
    total_distance: float


def _distance(a: BinPoint, b: BinPoint) -> float:
    return sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)


def compute_route(bins: Iterable[BinPoint], threshold: int) -> RouteResult:
    targets = [bin_point for bin_point in bins if bin_point.fill >= threshold]

    if not targets:
        return RouteResult(selected_bins=[], route=[], total_distance=0.0)

    current = BinPoint(bin_id="depot", x=0.0, y=0.0, fill=0)
    remaining = targets[:]
    route: list[str] = []
    total_distance = 0.0

    while remaining:
        next_bin = min(remaining, key=lambda item: _distance(current, item))
        total_distance += _distance(current, next_bin)
        route.append(next_bin.bin_id)
        current = next_bin
        remaining.remove(next_bin)

    return RouteResult(selected_bins=targets, route=route, total_distance=round(total_distance, 2))
