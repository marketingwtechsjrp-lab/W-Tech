'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { useScroll } from '@/components/ui/use-scroll';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '@/context/SettingsContext';
import { Settings as GearIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import SpringHeaderDropdown from './SpringHeaderDropdown';

export function Header() {
	const [open, setOpen] = React.useState(false);
	const [isMolasOpen, setIsMolasOpen] = React.useState(false);
	const scrolled = useScroll(10);
	const { get } = useSettings();
	const { user, setShowLoginModal } = useAuth();
	const { t } = useLanguage();
	const location = useLocation();
	const navigate = useNavigate();

	const isHome = location.pathname === '/';
	const logoUrl = get('logo_url', '');
	const siteTitle = get('site_title', 'W-TECH');

	const links = [
		{ label: t.nav.home, href: '/', key: 'home' },
		{ label: t.nav.springs, href: '/molas', key: 'molas' },
		{ label: t.nav.oil, href: '/oleo', key: 'oil' },
		{ label: t.nav.courses, href: '/cursos', key: 'courses' },
		{ label: t.nav.mechanics, href: '/mapa', key: 'mechanics' },
		{ label: t.nav.store, href: 'https://w-techstore.com.br/', isExternal: true, key: 'store' },
		{ label: t.nav.blog, href: '/blog', key: 'blog' },
		{ label: t.nav.contact, href: '/contato', key: 'contact' },
	];

	React.useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [open]);

	const headerActive = scrolled || !isHome || open;

	return (
		<header
			onMouseLeave={() => setIsMolasOpen(false)}
			className={cn(
				'fixed top-0 z-[100] mx-auto w-full border-b border-transparent transition-all duration-300 ease-out md:left-1/2 md:-translate-x-1/2',
				{
					'bg-black/95 supports-[backdrop-filter]:bg-black/50 border-white/10 backdrop-blur-lg md:top-4 md:max-w-6xl md:rounded-full md:border md:shadow-2xl':
						headerActive && !open,
					'bg-black/90': open,
					'bg-transparent top-0 max-w-full': !headerActive && !open,
				},
			)}
		>
			<nav
				className={cn(
					'flex h-20 w-full items-center justify-between px-6 transition-all duration-300 md:h-16',
					{
						'h-14 md:h-12': headerActive,
					},
				)}
			>
				{/* Logo */}
				<Link to="/" className="flex items-center gap-2 z-[110]">
					{logoUrl ? (
						<img 
							src={logoUrl} 
							alt={siteTitle} 
							className={cn(
								"h-10 w-auto object-contain transition-all",
								(!headerActive) ? "h-12" : "h-8"
							)} 
						/>
					) : (
						<span className={cn(
							"font-black tracking-tighter transition-all text-white",
							headerActive ? "text-xl" : "text-2xl"
						)}>
							W-TECH
						</span>
					)}
				</Link>

				{/* Desktop Menu */}
				<div className="hidden items-center gap-1 md:flex">
					{links.map((link) => {
						const isExternal = link.isExternal;
						const content = (
							<span className={cn(
								"text-[10px] font-bold uppercase tracking-widest transition-colors hover:text-wtech-gold px-2.5 py-2 rounded-md",
								headerActive ? "text-gray-300" : "text-white"
							)}>
								{link.label}
							</span>
						);

						if (isExternal) {
							return (
								<a 
									key={link.key} 
									href={link.href} 
									target="_blank" 
									rel="noopener noreferrer" 
									className="flex items-center"
									onMouseEnter={() => setIsMolasOpen(false)}
								>
									{content}
								</a>
							);
						}

						return (
							<Link 
								key={link.key} 
								to={link.href} 
								className="flex items-center"
								onMouseEnter={() => {
									if (link.key === 'molas') {
										setIsMolasOpen(true);
									} else {
										setIsMolasOpen(false);
									}
								}}
							>
								{content}
							</Link>
						);
					})}
					
					{/* Language Switcher */}
					<LanguageSwitcher className="ml-2 mr-1" />

					{/* Member Area (Gear Icon) */}
					<button 
						onClick={() => user ? navigate('/admin') : setShowLoginModal(true)}
						onMouseEnter={() => setIsMolasOpen(false)}
						className="p-1.5 text-gray-400 hover:text-wtech-gold transition-colors"
						title={t.header.myAccount}
					>
						<GearIcon size={16} />
					</button>

					<Button 
						asChild
						className="rounded-full bg-wtech-gold text-black hover:bg-yellow-400 font-bold uppercase tracking-widest text-[9px] px-4 ml-1"
						size="sm"
						onMouseEnter={() => setIsMolasOpen(false)}
					>
						<Link to="/meus-pedidos">{t.header.myAccount}</Link>
					</Button>
				</div>

				{/* Mobile Toggle */}
				<Button size="icon" variant="ghost" onClick={() => setOpen(!open)} className="md:hidden text-white z-[110]">
					<MenuToggleIcon open={open} className="size-6" duration={300} />
				</Button>
			</nav>

			{/* Dropdown de Busca de Molas */}
			<SpringHeaderDropdown isOpen={isMolasOpen} onClose={() => setIsMolasOpen(false)} />

			{/* Mobile Menu Overlay */}
			<div
				className={cn(
					'fixed inset-0 z-[105] flex flex-col bg-black/95 backdrop-blur-xl transition-all duration-300 md:hidden',
					open ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none',
				)}
			>
				<div
					className={cn(
						'flex h-full w-full flex-col justify-center items-center gap-y-6 p-8 transition-transform duration-300',
						open ? 'scale-100 translate-y-0' : 'scale-95 -translate-y-4',
					)}
				>
					<LanguageSwitcher className="mb-4" />

					<div className="flex flex-col items-center gap-y-4">
						{links.map((link) => (
							link.isExternal ? (
								<a
									key={link.key}
									href={link.href}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xl font-black uppercase tracking-tighter text-white hover:text-wtech-gold transition-colors"
								>
									{link.label}
								</a>
							) : (
								<Link
									key={link.key}
									onClick={() => setOpen(false)}
									className="text-xl font-black uppercase tracking-tighter text-white hover:text-wtech-gold transition-colors"
									to={link.href}
								>
									{link.label}
								</Link>
							)
						))}
					</div>

					<div className="flex flex-col items-center gap-y-3 mt-4 w-full max-w-xs">
						<Button 
							onClick={() => { setOpen(false); user ? navigate('/admin') : setShowLoginModal(true); }}
							variant="outline"
							className="w-full border-white/20 text-white font-bold uppercase tracking-widest text-xs py-3"
						>
							{user ? t.header.admin : t.header.login}
						</Button>
					</div>
				</div>
			</div>
		</header>
	);
}
