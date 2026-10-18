import React from 'react';
import { User, UserRole } from '../types/mandao';

interface HeaderProps {
  titulo: string;
  pueblo: string;
  currentUser: User | null;
  activeRole: UserRole;
  isRefreshing: boolean;
  cartCount: number;
  cartPulse: boolean;
  onRefresh: () => void;
  onOpenCart: () => void;
  onOpenAccessModal: () => void;
  onQuickSwitchRole: (role: UserRole) => void;
}

export const Header: React.FC<HeaderProps> = ({
  titulo,
  pueblo,
  currentUser,
  activeRole,
  isRefreshing,
  cartCount,
  cartPulse,
  onRefresh,
  onOpenCart,
  onOpenAccessModal,
  onQuickSwitchRole,
}) => {
  return (
    <header className="w-full bg-[#18181E] border-b border-white/10 px-3 py-2 flex items-center justify-between z-30 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#FFCC00] flex items-center justify-center font-black text-sm text-[#141416] shadow-sm">
          M
        </div>
        <div>
          <h1 className="font-heading font-black text-sm text-white leading-none">
            {titulo.toLowerCase()}
            <span className="text-[#FFCC00]">.</span>
          </h1>
          <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block mt-0.5">
            {pueblo}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Quick Role Switcher for instant testing */}
        <div className="hidden sm:flex items-center bg-black/40 border border-white/10 rounded-full p-0.5 text-[10px] font-bold text-neutral-300 mr-1">
          <button
            onClick={() => onQuickSwitchRole('cliente')}
            className={`px-2 py-0.5 rounded-full transition ${activeRole === 'cliente' ? 'bg-[#FFCC00] text-[#141416]' : 'hover:text-white'}`}
            title="Vista Cliente"
          >
            Cliente
          </button>
          <button
            onClick={() => onQuickSwitchRole('comercio')}
            className={`px-2 py-0.5 rounded-full transition ${activeRole === 'comercio' ? 'bg-purple-500 text-white' : 'hover:text-white'}`}
            title="Panel Comercio"
          >
            Comercio
          </button>
          <button
            onClick={() => onQuickSwitchRole('repartidor')}
            className={`px-2 py-0.5 rounded-full transition ${activeRole === 'repartidor' ? 'bg-emerald-500 text-white' : 'hover:text-white'}`}
            title="Panel Repartidor"
          >
            Repartidor
          </button>
          <button
            onClick={() => onQuickSwitchRole('admin')}
            className={`px-2 py-0.5 rounded-full transition ${activeRole === 'admin' ? 'bg-amber-500 text-[#141416]' : 'hover:text-white'}`}
            title="Super Admin"
          >
            Admin
          </button>
        </div>

        {/* Cart Icon Button [53], [54] */}
        <button
          onClick={onOpenCart}
          className={`relative w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-white active:scale-95 transition ${
            cartPulse ? 'scale-125 ring-2 ring-[#FFCC00] bg-[#FFCC00]/20' : ''
          }`}
          title="Ver Carrito de Compras"
        >
          <i className="fa-solid fa-cart-shopping text-xs"></i>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#FFCC00] text-[#141416] text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </button>

        <button
          onClick={onRefresh}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-neutral-300 active:scale-95 transition"
          title="Actualizar datos"
        >
          <i className={`fa-solid fa-rotate-right text-xs ${isRefreshing ? 'spin' : ''}`}></i>
        </button>

        <button
          onClick={onOpenAccessModal}
          className="flex items-center gap-1.5 bg-[#FFCC00] text-[#141416] px-3 py-1.5 rounded-full text-xs font-black active:scale-95 transition hover:brightness-105"
        >
          <i className="fa-solid fa-user text-[10px]"></i>
          <span>
            {currentUser ? currentUser.nombre.split(' ')[0] : 'Acceder'}
          </span>
        </button>
      </div>
    </header>
  );
};
