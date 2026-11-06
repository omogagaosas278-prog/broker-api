import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// CUSTOMER – strict ownership

export const getCustomerProfile = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        status: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomerWallets = async (req: Request, res: Response) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        currency: true,
        balance: true,
        createdAt: true,
      },
    });
    return res.json(wallets);
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const placeCustomerTrade = async (req: Request, res: Response) => {
  const { walletId, symbol, amount, price, type } = req.body;

  if (!walletId || !symbol || amount == null || price == null || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!['BUY', 'SELL'].includes(type)) {
    return res.status(400).json({ error: 'type must be BUY or SELL' });
  }

  try {
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        userId: req.user!.id,
      },
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found or does not belong to you' });
    }

    const trade = await prisma.$transaction(async (tx) => {
      return tx.trade.create({
        data: {
          walletId: wallet.id,
          symbol: String(symbol).toUpperCase(),
          amount: new Decimal(amount),
          price: new Decimal(price),
          type,
        },
      });
    });

    return res.status(201).json(trade);
  } catch {
    return res.status(500).json({ error: 'Failed to place trade' });
  }
};

// ADMIN

export const adminListAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        wallets: {
          select: { id: true, currency: true, balance: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(users);
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve users' });
  }
};

export const adminAdjustBalance = async (req: Request, res: Response) => {
  const { walletId, newBalance } = req.body;

  if (!walletId || newBalance == null) {
    return res.status(400).json({ error: 'walletId and newBalance required' });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { id: walletId },
        data: { balance: new Decimal(newBalance) },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'BALANCE_ADJUSTMENT',
          targetId: walletId,
          details: { newBalance },
          ip: req.ip,
          userAgent: req.get('user-agent') || undefined,
        },
      });

      return wallet;
    });

    return res.json({ message: 'Balance updated', wallet: updated });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    return res.status(500).json({ error: 'Failed to update balance' });
  }
};

export const adminGetAllTrades = async (req: Request, res: Response) => {
  try {
    const trades = await prisma.trade.findMany({
      include: {
        wallet: {
          select: {
            id: true,
            currency: true,
            user: { select: { id: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return res.json(trades);
  } catch {
    return res.status(500).json({ error: 'Failed to fetch trades' });
  }
};

export const adminSuspendUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { status } = req.body;

  if (!['ACTIVE', 'SUSPENDED', 'PENDING_KYC'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { status },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'USER_STATUS_CHANGE',
          targetId: userId,
          details: { newStatus: status },
          ip: req.ip,
          userAgent: req.get('user-agent') || undefined,
        },
      });

      return user;
    });

    return res.json({ message: 'User status updated', user: updated });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    return res.status(500).json({ error: 'Failed to update user' });
  }
};
