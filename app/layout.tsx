import type { Metadata } from 'next';
import Script from 'next/script';
import { Toaster } from 'react-hot-toast';
import TikTokPixelTracker from '../components/TikTokPixelTracker';
import './globals.css';

export const metadata: Metadata = {
  title: 'ManAIger — Your AI Manager for Streamers and Creators',
  description: 'AI-powered management platform for content creators and streamers',
  icons: {
    icon: '/logo.png'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content="ManAIger — Your AI Manager for Creators" />
        <meta property="og:description" content="Match brands, automate outreach, and invoice—fast." />
        <meta property="og:image" content="https://manaiger.co/og.jpg" />
        <meta property="og:url" content="https://manaiger.co/" />
        <meta property="og:type" content="website" />

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-MVX72ESMHV"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-MVX72ESMHV');
          `}
        </Script>

        {/* Google Analytics Event Helper */}
        <Script id="ga-helper" strategy="afterInteractive">
          {`
            window.gtagTrack = function(eventName, eventParams) {
              try {
                if (typeof gtag !== 'undefined') {
                  gtag('event', eventName, eventParams || {});
                }
              } catch(err) {
                console.error('[Google Analytics] Error:', err);
              }
            };
          `}
        </Script>

        {/* Rewardful tracking script - traditional method */}
        {process.env.NEXT_PUBLIC_REWARDFUL_KEY && (
          <script 
            async 
            src="https://r.wdfl.co/rw.js" 
            data-rewardful={process.env.NEXT_PUBLIC_REWARDFUL_KEY}
          />
        )}


          {/* Meta Pixel Code */}
          <script dangerouslySetInnerHTML={{__html:`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '4281371148854144');
          fbq('track', 'PageView');`}} />
          <noscript><img height="1" width="1" style={{display:'none'}} src="https://www.facebook.com/tr?id=4281371148854144&ev=PageView&noscript=1" /></noscript>

          {/* Meta Pixel Event Helper */}
          <script dangerouslySetInnerHTML={{__html:`window.manaiTrack=function(e,params){try{
            if(e==='account_created') fbq('track','CompleteRegistration');
            else if(e==='brand_match_viewed') fbq('trackCustom','BrandMatchViewed');
            else if(e==='brand_match_generated') fbq('trackCustom','BrandMatchGenerated');
            else if(e==='outreach_draft') fbq('trackCustom','OutreachDraftCreated');
            else if(e==='outreach_draft_sent') fbq('trackCustom','OutreachDraftSent');
            else if(e==='invoice_created') fbq('trackCustom','InvoiceCreated');
            else if(e==='subscribe') fbq('track','Subscribe',params||{});
          }catch(_){}};`}} />

          {/* TikTok Pixel Code - Load pixel on every page */}
          <script dangerouslySetInnerHTML={{__html:`!function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))};};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
            ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
            ttq.load('D34CKLJC77U7TGIREQ50');
            ttq.page();
          }(window, document, 'ttq');`}} />

    {/* TikTok Pixel Event Helper - Enhanced with test event support */}
    <script dangerouslySetInnerHTML={{__html:`window.ttqTrack=function(e){try{
     var baseParams = {};
     if(window.tt_test_id) baseParams.test_event_code = window.tt_test_id;

     if(e==='account_created') {
       var params = Object.assign({event_id:'reg_'+Date.now(),value:0,currency:'USD'}, baseParams);
       ttq.track('CompleteRegistration', params);
     }
     else if(e==='brand_match_viewed') {
       var params = Object.assign({content_category:'BrandMatch'}, baseParams);
       ttq.track('ViewContent', params);
     }
     else if(e==='brand_match_generated') {
       var params = Object.assign({content_category:'BrandMatch'}, baseParams);
       ttq.track('GenerateLead', params);
     }
     else if(e==='outreach_draft') {
       var params = Object.assign({description:'OutreachDraft'}, baseParams);
       ttq.track('StartTrial', params);
     }
     else if(e==='outreach_draft_sent') {
       var params = Object.assign({description:'OutreachDraftSent'}, baseParams);
       ttq.track('StartTrial', params);
     }
     else if(e==='invoice_created') {
       var params = Object.assign({description:'InvoiceCreated'}, baseParams);
       ttq.track('Subscribe', params);
     }
     else console.warn('[TikTok Pixel] Unknown event:', e);
    }catch(err){console.error('[TikTok Pixel] Error:', err);}};`}} />
      </head>
      <body>
        <TikTokPixelTracker />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff'
            },
            success: {
              style: {
                background: '#10b981'
              }
            },
            error: {
              style: {
                background: '#ef4444'
              }
            }
          }}
        />
      </body>
    </html>
  );
}