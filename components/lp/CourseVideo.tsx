import React from 'react';

/** Vídeo das aulas práticas (aprovado em 16/10/2026): vai nas LPs de curso presencial, menos no Experience, que ganha um vídeo próprio. */
export const PRACTICAL_CLASSES_VIDEO_URL = '/videos/wtech-aulas-praticas.mp4';

/** Arquivo de vídeo servido direto (mp4/webm), e não link do YouTube. */
export const isDirectVideo = (url?: string | null): boolean =>
    !!url && /^(https?:\/\/|\/)[^\s]+\.(mp4|webm)(\?.*)?$/i.test(url);

/** A capa fica ao lado do arquivo em /videos, com o mesmo nome em .webp. */
export const directVideoPoster = (url: string) =>
    url.startsWith('/videos/') ? url.replace(/\.(mp4|webm)(\?.*)?$/i, '.webp') : undefined;

/** LP gerada sem cadastro (curso sem landing): presencial ganha o vídeo das aulas práticas; online e Experience ficam sem. */
export const defaultCourseVideoUrl = (course: { title?: string | null; location_type?: string | null }) =>
    course.location_type === 'Online' || /experience/i.test(course.title || '') ? null : PRACTICAL_CLASSES_VIDEO_URL;

/** Player do vídeo da LP: link do YouTube vira iframe; arquivo próprio usa o player nativo e só baixa ao dar play. */
export function CourseVideo({
    url,
    title = 'Vídeo do curso',
    className = 'w-full h-full',
    autoPlay = false,
}: {
    url: string;
    title?: string;
    className?: string;
    autoPlay?: boolean;
}) {
    if (isDirectVideo(url)) {
        return (
            <video
                src={url}
                poster={directVideoPoster(url)}
                className={`${className} object-contain bg-black`}
                controls
                autoPlay={autoPlay}
                playsInline
                preload={autoPlay ? 'auto' : 'none'}
                aria-label={title}
            />
        );
    }
    const embed = url.replace('watch?v=', 'embed/');
    return (
        <iframe
            src={autoPlay ? `${embed}${embed.includes('?') ? '&' : '?'}autoplay=1` : embed}
            className={className}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
        />
    );
}
