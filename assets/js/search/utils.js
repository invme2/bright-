// Adapted from i18next v25.3.1 (MIT Licence)
// https://github.com/i18next/i18next/blob/fdc51d2a509c97e225b34240b28d0d83db143adc/src/i18next.js#L535


/** @param {string} code  */
function formatLanguageCode(code) {
    // http://www.iana.org/assignments/language-tags/language-tags.xhtml
    if (typeof code === 'string' && code.indexOf('-') > -1) {
        let formattedCode;
        try {
            formattedCode = Intl.getCanonicalLocales(code)[0];
        } catch (e) {
            /* fall through */
        }

        if (formattedCode) {
            return formattedCode; 
        }

        return code;
    }

    return code;
}

/** @param {string} code  */
function getLanguagePartFromCode(code) {
    code = code?.replace('_', '-');
    if (!code || code.indexOf('-') < 0) { 
        return code;
    }

    const p = code.split('-');
    return formatLanguageCode(p[0]);
}

/** 
 * Return language direction
 * 
 * @param {string} lng  
 * @returns {'ltr' | 'rtl'}
 * */
export function direction(lng) {
    if (!lng) {
        return 'ltr'; 
    }

    try {
        if (Intl?.Locale) {
            const l = new Intl.Locale(lng);
            const ti = l?.getTextInfo?.();

            if (ti?.direction) {
                return ti.direction;
            }
        }
    } catch (e) {
        /* fall through */
    }

    const rtlLngs = [
      'ar',
      'shu',
      'sqr',
      'ssh',
      'xaa',
      'yhd',
      'yud',
      'aao',
      'abh',
      'abv',
      'acm',
      'acq',
      'acw',
      'acx',
      'acy',
      'adf',
      'ads',
      'aeb',
      'aec',
      'afb',
      'ajp',
      'apc',
      'apd',
      'arb',
      'arq',
      'ars',
      'ary',
      'arz',
      'auz',
      'avl',
      'ayh',
      'ayl',
      'ayn',
      'ayp',
      'bbz',
      'pga',
      'he',
      'iw',
      'ps',
      'pbt',
      'pbu',
      'pst',
      'prp',
      'prd',
      'ug',
      'ur',
      'ydd',
      'yds',
      'yih',
      'ji',
      'yi',
      'hbo',
      'men',
      'xmn',
      'fa',
      'jpr',
      'peo',
      'pes',
      'prs',
      'dv',
      'sam',
      'ckb'
    ];

    if (lng.toLowerCase().indexOf('-latn') > 1) {
        return 'ltr'; 
    }

    return rtlLngs.indexOf(getLanguagePartFromCode(lng)) > -1 || lng.toLowerCase().indexOf('-arab') > 1
      ? 'rtl'
      : 'ltr';
}