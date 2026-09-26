import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { handleLeadUpsert } from '../lib/leadDistribution';
import { filterBlockedTestimonials, resolveCourseTestimonials } from '../lib/testimonials';
import { resolveScheduleModules } from '../lib/schedule';
import { LandingPage, Course } from '../types';
import { lpPathForTemplate } from '../lib/landingTemplates';
import { ORIGINAL_COURSE_IMAGE } from '../lib/landingMedia';
export { lpPathForTemplate } from '../lib/landingTemplates';
import {
    trackConfiguredLandingPageRegistration,
    trackConfiguredLandingPageView,
} from '../lib/metaPixel';

/**
 * Hook compartilhado dos viewers de Landing Page (V5+).
 * Replica o contrato de dados dos viewers V1–V4 (fetch por slug ou courseId,
 * LP virtual a partir do curso, mapeamento snake_case → camelCase, redirect
 * para a rota do template salvo, escassez e submit com checkout direto).
 */

export interface LandingPageWithCourse extends LandingPage {
    course: Course & {
        registeredCount?: number;
        startTime?: string;
        endTime?: string;
        dateEnd?: string;
        mapUrl?: string;
        addressNeighborhood?: string;
        checkoutType?: string;
        deposit_price?: number;
        schedule?: string;
    };
}

/** Rota pública de cada template. */

export function useLandingPage(ownTemplate: string) {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    const [lp, setLp] = useState<LandingPageWithCourse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [spotsLeft, setSpotsLeft] = useState<number>(5);
    const [form, setForm] = useState({ name: '', email: '', phone: '' });
    const [paymentType, setPaymentType] = useState<'full' | 'deposit'>('full');
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const submitLock = useRef(false);
    const isPreview = new URLSearchParams(window.location.search).get('preview') === '1';

    useEffect(() => {
        if (lp && !isPreview) trackConfiguredLandingPageView(lp);
    }, [lp, isPreview]);
    const [showFloatingCTA, setShowFloatingCTA] = useState(false);

    // Floating CTA após 400px de scroll
    useEffect(() => {
        const onScroll = () => setShowFloatingCTA(window.scrollY > 400);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const fetchLP = async () => {
            setLp(null);
            setError('');
            setSubmitted(false);
            try {
            if (!slug) { setLoading(false); return; }
            setLoading(true);

            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[0-89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);
            let lpData: any = null;

            if (isUUID) {
                const { data: linkedLP, error: linkedError } = await supabase
                    .from('SITE_LandingPages')
                    .select('*, course:SITE_Courses(*, SITE_Enrollments(count))')
                    .eq('course_id', slug)
                    .maybeSingle();
                if (linkedError) throw linkedError;

                if (linkedLP) {
                    lpData = linkedLP;
                } else {
                    const { data: courseData, error: courseError } = await supabase
                        .from('SITE_Courses')
                        .select('*, SITE_Enrollments(count)')
                        .eq('id', slug)
                        .maybeSingle();
                    if (courseError) throw courseError;
                    if (courseData) {
                        lpData = {
                            id: 'virtual',
                            course_id: courseData.id,
                            slug: courseData.id,
                            title: courseData.title,
                            subtitle: courseData.description
                                ? courseData.description.substring(0, 150) + '...'
                                : 'Prepare-se para transformar sua carreira com a metodologia W-Tech.',
                            hero_image: courseData.image || ORIGINAL_COURSE_IMAGE,
                            benefits: [],
                            modules: [],
                            instructor_name: courseData.instructor || 'Equipe W-Tech',
                            instructor_bio: 'Especialista certificado W-Tech.',
                            status: 'Published',
                            // LP virtual (curso sem LP salva) nasce no template padrão V9
                            template: 'v9',
                            course: courseData
                        };
                    }
                }
            } else {
                const { data, error: pageError } = await supabase
                    .from('SITE_LandingPages')
                    .select('*, course:SITE_Courses(*, SITE_Enrollments(count))')
                    .eq('slug', slug)
                    .maybeSingle();
                if (pageError) throw pageError;
                lpData = data;
            }

            if (cancelled) return;
            if (!lpData) {
                setLoading(false);
                return;
            }

            // Redirect para o viewer correto se o template salvo não for este.
            // ?preview=1 pula o redirect para pré-visualizar qualquer template sem salvar.
            const savedTemplate = lpData.template || 'v1';
            if (savedTemplate !== ownTemplate && !isPreview) {
                navigate(`${lpPathForTemplate(savedTemplate)}/${slug}${window.location.search}${window.location.hash}`, { replace: true });
                return;
            }

            const rawCourse = lpData.course;
            const mappedCourse = rawCourse
                ? {
                      ...rawCourse,
                      locationType: rawCourse.location_type,
                      registeredCount: rawCourse.SITE_Enrollments?.[0]?.count || 0,
                      startTime: rawCourse.start_time,
                      endTime: rawCourse.end_time,
                      dateEnd: rawCourse.date_end,
                      mapUrl: rawCourse.map_url,
                      addressNeighborhood: rawCourse.address_neighborhood,
                      checkoutType: rawCourse.checkout_type,
                      isInternational: rawCourse.is_international,
                      whatToBring: rawCourse.what_to_bring
                  }
                : null;

            const mapped: LandingPageWithCourse = {
                ...lpData,
                heroImage: lpData.hero_image,
                heroSecondaryImage: lpData.hero_secondary_image,
                videoUrl: lpData.video_url,
                instructorName: lpData.instructor_name,
                instructorBio: lpData.instructor_bio,
                instructorImage: lpData.instructor_image,
                whatsappNumber: lpData.whatsapp_number,
                pixelId: lpData.pixel_id,
                quizEnabled: isPreview ? false : lpData.quiz_enabled,
                fakeAlertsEnabled: lpData.fake_alerts_enabled,
                handsOnEnabled: lpData.hands_on_enabled !== false,
                testimonials: ['v10', 'v11', 'v12'].includes(ownTemplate) ? filterBlockedTestimonials(lpData.testimonials) : resolveCourseTestimonials(lpData.testimonials),
                scheduleModules: ['v10', 'v11', 'v12'].includes(ownTemplate) ? (lpData.schedule_modules || []) : resolveScheduleModules(lpData.schedule_modules),
                sectionOrder: lpData.section_order,
                course: mappedCourse,
                courseId: lpData.course_id
            };

            setLp(mapped);

            if (mappedCourse) {
                const total = mappedCourse.capacity || 20;
                const enrolled = mappedCourse.registeredCount || 0;
                setSpotsLeft(Math.max(0, total - enrolled));
            }
            setLoading(false);
            } catch (err) {
                if (!cancelled) { setError('Não foi possível carregar esta página. Tente novamente.'); setLoading(false); }
            }
        };
        void fetchLP();
        return () => { cancelled = true; };
    }, [slug, navigate, ownTemplate, isPreview]);

    // Regras derivadas compartilhadas
    const isInternationalCourse = !!(lp?.course?.isInternational || lp?.course?.currency === 'EUR' || (lp?.course as any)?.is_international);
    const isFullOrDone = lp?.course?.status === 'Full' || lp?.course?.status === 'Completed';
    /** Preço SÓ aparece quando o checkout automático está ativo para este curso. */
    const checkoutAtivo = lp?.course?.checkoutType === 'automated' && !isInternationalCourse && !isFullOrDone;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lp || isPreview || submitLock.current) return;
        submitLock.current = true;
        setSubmitting(true);
        try {
            const payload = {
                name: form.name,
                email: form.email,
                phone: form.phone,
                type: 'Course_Registration',
                status: 'New',
                context_id: `LP: ${lp.title} (${lp.slug})`,
                tags: [
                    'landing_page',
                    lp.slug ? String(lp.slug) : 'virtual_lp',
                    isFullOrDone ? 'lista_espera_curso' : '',
                    checkoutAtivo ? 'checkout_direto' : ''
                ].filter(Boolean),
                origin: window.location.href,
                assigned_to: null
            };

            const leadResult = await handleLeadUpsert(payload, { itemName: lp.title });
            if (!leadResult?.id) throw new Error('Não foi possível confirmar o cadastro.');
            trackConfiguredLandingPageRegistration(lp);

            const courseIdForCheckout = lp.courseId || (lp as any).course_id;
            if (checkoutAtivo && courseIdForCheckout && leadResult?.id) {
                const searchParams = new URLSearchParams(window.location.search);
                searchParams.set('lid', leadResult.id);
                searchParams.set('type', paymentType);
                navigate(`/checkout-curso/${courseIdForCheckout}?${searchParams.toString()}`);
                return;
            }
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            alert('Erro ao enviar inscrição. Tente novamente ou fale conosco no WhatsApp.');
        } finally {
            submitLock.current = false;
            setSubmitting(false);
        }
    };

    const scrollToForm = () => {
        document.getElementById('enroll-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    return {
        slug,
        lp,
        loading,
        error,
        spotsLeft,
        form,
        setForm,
        paymentType,
        setPaymentType,
        submitted,
        submitting,
        setSubmitted,
        showFloatingCTA,
        isInternationalCourse,
        isFullOrDone,
        checkoutAtivo,
        handleSubmit,
        scrollToForm
    };
}
