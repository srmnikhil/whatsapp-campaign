import { useState } from 'react';
import { HEADER_FORMATS, NAME_VARIABLE } from '../constants/templates.js';

/**
 * Authentic Full Mobile WhatsApp Screen Preview.
 * Renders an authentic smartphone mockup running WhatsApp, complete with:
 * - Flagship smartphone chassis & Dynamic Island
 * - WhatsApp Green App Bar with verified business badge, audio/video call icons
 * - Authentic WhatsApp doodle chat wallpaper
 * - Security encryption notice
 * - WhatsApp incoming message bubble with bubble tail, image header, body, footer, double-check read status, and action buttons
 * - WhatsApp bottom message input bar & microphone button
 * - Home swipe indicator
 * - Support for 'phone' (realistic 390px smartphone chassis) and 'wide' (full left-to-right canvas)
 */
export function TemplatePreview({
  header,
  imageUrl,
  bodyText,
  footerText,
  buttons = [],
  name,
  businessName = 'Garaaz Notification',
  defaultMode = 'phone',
}) {
  const [mode] = useState(defaultMode); // 'phone' | 'wide'
  const body = name ? bodyText?.split(NAME_VARIABLE).join(name) : bodyText;
  const isImage = header?.format === HEADER_FORMATS.IMAGE;
  const isTextHeader = header?.format === HEADER_FORMATS.TEXT;

  const isWide = mode === 'wide';

  return (
    <div className="flex flex-col items-center w-full" aria-label="Message preview">
      {/* Screen Container */}
      <div
        className={`relative select-none transition-all duration-300 ${
          isWide
            ? 'w-full rounded-2xl border-2 border-slate-700/60 bg-slate-900 p-2 shadow-2xl'
            : 'aspect-[9/16] h-[min(calc(100vh-12rem),640px)] max-w-full rounded-[2.4rem] border-[3px] border-slate-700 bg-black p-1.5 shadow-2xl shadow-slate-950/40'
        }`}
      >
        {/* Side physical buttons (simulated on chassis in phone mode) */}
        {!isWide && (
          <>
            <div className="absolute -right-[6px] top-24 h-10 w-[3px] rounded-r-md bg-slate-600" />
            <div className="absolute -right-[6px] top-40 h-14 w-[3px] rounded-r-md bg-slate-600" />
          </>
        )}

        {/* Inner Screen Display */}
        <div className={`relative flex flex-col overflow-hidden bg-[#EFEAE2] ${
          isWide ? 'min-h-[500px] rounded-xl' : 'h-full rounded-[2rem]'
        }`}>
          {/* Dynamic Island & Phone Status Bar */}
          <div className="relative z-20 flex items-center justify-between bg-[#075E54] px-6 pt-3 pb-1.5 text-white">
            <span className="text-[12px] font-semibold tracking-tight">9:41</span>
            {/* Punch-hole camera */}
            {!isWide && (
              <div className="absolute left-1/2 top-2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-black ring-1 ring-slate-700" />
            )}
            <div className="flex items-center gap-1.5 text-white">
              <span className="text-[10px] font-bold">5G</span>
              <div className="flex h-2.5 w-5 items-center rounded-xs border border-white/80 p-0.5">
                <div className="h-full w-full rounded-2xs bg-emerald-400" />
              </div>
            </div>
          </div>

          {/* WhatsApp App Header Bar */}
          <div className="z-10 flex items-center justify-between border-b border-[#054c44] bg-[#075E54] px-3.5 py-2.5 text-white shadow-xs">
            <div className="flex items-center gap-2.5">
              {/* Back chevron */}
              <svg className="h-5 w-5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>

              {/* Business Avatar with Verified Badge */}
              <div className="relative shrink-0">
                <img
                  src="/logo.jpg"
                  alt="Business Logo"
                  className="h-9.5 w-9.5 rounded-full object-cover shadow-xs border border-white/30"
                />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-emerald-600 shadow-2xs">
                  <svg className="h-2.5 w-2.5 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>

              {/* Business Name & Status */}
              <div className="leading-tight">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-xs tracking-tight text-white">{businessName}</span>
                  <svg className="h-3 w-3 text-emerald-300 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-[10px] text-emerald-100/90 font-normal">Official Business Account · online</p>
              </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-3 text-white/90">
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </div>
          </div>

          {/* WhatsApp Chat Canvas */}
          <div
            className="relative min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3"
            style={{
              backgroundColor: '#efeae2',
              backgroundImage: `radial-gradient(#c8c2b7 0.75px, transparent 0.75px), radial-gradient(#c8c2b7 0.75px, #efeae2 0.75px)`,
              backgroundSize: '30px 30px',
              backgroundPosition: '0 0, 15px 15px',
            }}
          >
            {/* Encryption Notice */}
            <div className="mx-auto max-w-[280px] rounded-lg bg-[#FFF7D6] px-2.5 py-1.5 text-center text-[10px] text-slate-700 shadow-2xs border border-[#F3E29D] flex items-center justify-center gap-1.5">
              <svg className="h-3 w-3 text-amber-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span><span className="font-semibold">End-to-end encrypted</span> · No one outside this chat can read this.</span>
            </div>

            {/* Date pill */}
            <div className="flex justify-center">
              <span className="rounded-lg bg-white/90 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 shadow-2xs border border-black/5">
                Today
              </span>
            </div>

            {/* WhatsApp Message Bubble */}
            <div className={`relative rounded-2xl rounded-tl-xs bg-white text-sm shadow-[0_1px_2px_rgba(11,20,26,0.18)] border border-black/5 overflow-hidden ${
              isWide ? 'max-w-xl mx-auto' : 'max-w-[92%]'
            }`}>
              {/* Bubble Tail SVG */}
              <div className="absolute -left-2 top-0 h-3 w-3 overflow-hidden">
                <svg viewBox="0 0 8 13" className="h-full w-full fill-white">
                  <path d="M1.533 3.568L8 12.18V0H0c.66 1.05 1.18 2.27 1.533 3.568z" />
                </svg>
              </div>

              {/* Header: Image or Text */}
              {isImage && (
                imageUrl ? (
                  <div className="relative max-h-56 w-full overflow-hidden bg-slate-100 border-b border-black/5">
                    <img src={imageUrl} alt="Header" referrerPolicy="no-referrer" className="max-h-56 w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-xs text-slate-500 font-medium border-b border-black/5">
                    <div className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 opacity-60 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Campaign image attached</span>
                    </div>
                  </div>
                )
              )}

              <div className="flex flex-col gap-1.5 p-3.5">
                {isTextHeader && header?.text && (
                  <p className="font-bold text-slate-900 text-sm">{header.text}</p>
                )}

                <p className="whitespace-pre-wrap break-words text-slate-800 text-[13px] leading-relaxed font-sans">
                  {body || 'Hi there, your workshop promo is ready!'}
                </p>

                <div className="mt-1 flex items-baseline justify-between gap-2">
                  {footerText ? (
                    <p className="text-[11px] text-[#667781] font-normal">{footerText}</p>
                  ) : <span />}
                  <span className="flex items-center gap-1 text-[10px] text-[#667781] font-mono shrink-0">
                    <span>12:45</span>
                    <svg className="h-3.5 w-3.5 text-[#53bdeb] inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12l4 4L18 6M9 12l3 3L21 7" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              {buttons.length > 0 && (
                <div className="divide-y divide-slate-100 border-t border-slate-100 bg-white">
                  {buttons.map((button, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 text-center text-xs font-semibold text-[#00A884] hover:bg-slate-50 transition-colors"
                    >
                      {button.type === 'URL' ? (
                        <svg className="h-3.5 w-3.5 shrink-0 text-[#00A884]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      ) : button.type === 'PHONE_NUMBER' ? (
                        <svg className="h-3.5 w-3.5 shrink-0 text-[#00A884]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      ) : button.type === 'COPY_CODE' ? (
                        <svg className="h-3.5 w-3.5 shrink-0 text-[#00A884]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5 shrink-0 text-[#00A884]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      )}
                      <span>
                        {button.text || (button.type === 'COPY_CODE' ? `Copy Code: ${button.example || 'CODE'}` : 'Button')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Bottom Input Bar */}
          <div className="z-10 flex items-center gap-2 border-t border-slate-200/80 bg-[#F0F2F5] px-3 py-2">
            <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-2xs border border-slate-200">
              <svg className="h-4.5 w-4.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1 text-xs text-slate-400">Message</span>
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            {/* Circular Voice Note Button */}
            <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-[#00A884] text-white shadow-xs">
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          </div>

          {/* Bottom Home Swipe Bar */}
          {!isWide && (
            <div className="bg-[#F0F2F5] pb-2 pt-0.5">
              <div className="mx-auto h-1 w-28 rounded-full bg-slate-900/40" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
