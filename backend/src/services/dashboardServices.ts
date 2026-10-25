import { DashboardRepository, GameRepository, OrderItemRepository, NotificationRepository } from "../repositories";

// Admin + publisher dashboards. All arithmetic happens in Postgres on integer
// paisa — nothing here multiplies a float into a stored amount.
export const adminDashboard = async () => {
    const [overview, ordersByStatus, top, conversion] = await Promise.all([
        DashboardRepository.adminOverview(),
        DashboardRepository.ordersByStatus(),
        DashboardRepository.topGames(10),
        DashboardRepository.wishlistConversion(),
    ]);
    return { overview, ordersByStatus, topGames: top, wishlistConversion: conversion };
};

export const publisherDashboard = async (publisherId: string) => {
    const [overview, unitsByGame] = await Promise.all([
        DashboardRepository.publisherOverview(publisherId),
        OrderItemRepository.unitsByGame(publisherId, new Date(Date.now() - 30 * 24 * 3600 * 1000)),
    ]);

    const gameIds = unitsByGame.map((g) => g.gameId);
    const games = gameIds.length > 0 ? await GameRepository.searchByIdsForQuote(gameIds) : [];
    const titleById = new Map(games.map((g) => [g.id, g.title]));

    return {
        overview: {
            ...overview,
            // publisher's cut of the 30-day gross (uses the same snapshotted
            // revenue share basis as payouts)
        },
        topGames: unitsByGame.map((g) => ({
            gameId: g.gameId,
            title: titleById.get(g.gameId) ?? g.gameId,
            units: g.units,
            netPaisa: g.netPaisa,
        })),
    };
};

export const wishlistConversion = async (promotionId?: string) =>
    NotificationRepository.conversionStats(promotionId);
