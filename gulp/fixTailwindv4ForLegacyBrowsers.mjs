/** @type {import('postcss-load-config').Config} */
import postcss from 'postcss';
import { hasFallback, hasSupportsAtRuleAncestor } from '@csstools/utilities';
import { isFunctionNode, parseCommaSeparatedListOfComponentValues, replaceComponentValues, stringify, parseComponentValue, sourceIndices } from '@csstools/css-parser-algorithms';
import { tokenize } from '@csstools/css-tokenizer';

const COLOR_MIX_FUNCTION_REGEX = /\bcolor-mix\(/i;
const COLOR_MIX_NAME_REGEX = /^color-mix$/i;


// Polyfills @property definitions with regular CSS variables
const fixAtProperty = (root) => {
    const fallbackRules = []

    // 1. Collect initial-value props from @property at-rules
    root.walkAtRules('property', (rule) => {
        const varName = rule.params.trim();

        let value = null;
        let isLength = false;

        rule.walkDecls((decl) => {
            if (decl.prop === 'initial-value') {
                value = decl.value;
            }

            if (decl.prop === 'syntax' && decl.value === '"<length>"') {
                isLength = true;
            }
        });

        if (value !== null) {
            if (value === '0' && isLength) {
                fallbackRules.push(`${varName}: ${value}px;`);
            } else {
                fallbackRules.push(`${varName}: ${value};`);
            }
        }
        
    });

    // 2. Inject fallback variables if any exist
    if (fallbackRules.length > 0) {
        const fallbackCSS = `
            :root { \n\t${fallbackRules.join('\n\t')} \n}
        `.trim();

        const sourceFile = root.source?.input?.file || root.source?.input?.from;
        const fallbackAst = postcss.parse(fallbackCSS, { from: sourceFile });

        // Insert after last @import (or prepend if none found)
        let lastImportIndex = -1;
        root.nodes.forEach((node, i) => {
            if (node.type === 'atrule' && node.name === 'import') {
                lastImportIndex = i;
            }
        });

        if (lastImportIndex === -1) {
            root.prepend(fallbackAst);
        } else {
            root.insertAfter(root.nodes[lastImportIndex], fallbackAst);
        }
    }
}

// Removes `in <colorspace>` after `to left` or `to right` gradient args for older browsers
const fixGradientsColorSpace = (root) => {  
    root.walkDecls((decl) => {
        if (!decl.value || !decl.value.includes('in ')) return;

        decl.value = decl.value.replaceAll(/\b\s+in\s+oklab/g, () => {
            return ``;
        });
    });    
};


/* Transform color-mix() functions in CSS. */
const fixColorMix = (root) => {
    root.walkDecls((decl) => {
        const originalValue = decl.value;
        if (!(COLOR_MIX_FUNCTION_REGEX.test(originalValue))) {
            return;
        }
    
        if (hasFallback(decl)) {
            return;
        }
    
        if (hasSupportsAtRuleAncestor(decl, COLOR_MIX_FUNCTION_REGEX)) {
            return;
        }
    
        const tokens = tokenize({ css: originalValue });
        const replacedRGB = replaceComponentValues(
            parseCommaSeparatedListOfComponentValues(tokens),
            (componentValue) => {
                if (!isFunctionNode(componentValue) || !COLOR_MIX_NAME_REGEX.test(componentValue.getName())) {
                    return;
                }

                let funcValue = componentValue.toString();
                funcValue = funcValue.replace(/^color-mix\(/, "");
                funcValue = funcValue.replace(/\)$/, "");

                if (funcValue.includes("currentColor")) {
                    console.warn("Warning: Can't fix color-mix that's using currentColor");
                    return;
                }

                
                let funcParams = funcValue.split(",");

                if (funcParams.at(-1).trim() !== "transparent") {
                    throw Error("Color mix function not using transparent");
                }

                let [_, ...rest] = funcParams;
                rest.pop();

                let funcSecondParam = rest.join().split(" ");
                let alphaValue = funcSecondParam.pop().trim();
                let colorValue = funcSecondParam.join(" ").trim();


                if (!colorValue.startsWith("var(--color-")) {
                    throw Error("color-mix color isn't a var");
                }

                let newValue = `rgb(${colorValue} / ${alphaValue})`;
                const tokens = tokenize({ css: newValue });

                return parseComponentValue(tokens);
            },
        );

        const modifiedRGB = stringify(replacedRGB);
        if (modifiedRGB === originalValue) {
            return;
        }

        decl.cloneBefore({ value: modifiedRGB });
        decl.remove();
    });
};


/* Change oklch colors to rgb */
const fixColors = (root) => {
    root.walkRules((rule) => {
        if (!rule.selectors) return

        const isGray = rule.selectors.some(sel => sel.includes('html.has-grayscale-'));
        const allGrays = {
            "gray": {
                "--color-gray-50" : "249 250 251",
                "--color-gray-100": "243 244 246",
                "--color-gray-200": "229 231 235",
                "--color-gray-300": "209 213 219",
                "--color-gray-400": "156 163 175",
                "--color-gray-500": "107 114 128",
                "--color-gray-600": "75 85 99",
                "--color-gray-700": "55 65 81",
                "--color-gray-800": "31 41 55",
                "--color-gray-900": "17 24 39",
                "--color-gray-950": "3 7 18",
            },
            "slate": {
                "--color-gray-50" : "248 250 252",
                "--color-gray-100": "241 245 249",
                "--color-gray-200": "226 232 240",
                "--color-gray-300": "203 213 225",
                "--color-gray-400": "148 163 184",
                "--color-gray-500": "100 116 139",
                "--color-gray-600": "71 85 105",
                "--color-gray-700": "51 65 85",
                "--color-gray-800": "30 41 59",
                "--color-gray-900": "15 23 42",
                "--color-gray-950": "2 6 23",
            },   
            "zinc": {
                "--color-gray-50" : "250 250 250",
                "--color-gray-100": "244 244 245",
                "--color-gray-200": "228 228 231",
                "--color-gray-300": "212 212 216",
                "--color-gray-400": "161 161 170",
                "--color-gray-500": "113 113 122",
                "--color-gray-600": "82 82 91",
                "--color-gray-700": "63 63 70",
                "--color-gray-800": "39 39 42",
                "--color-gray-900": "24 24 27",
                "--color-gray-950": "9 9 11",
            },
            "stone": {
                "--color-gray-50" : "250 250 249",
                "--color-gray-100": "245 245 244",
                "--color-gray-200": "231 229 228",
                "--color-gray-300": "214 211 209",
                "--color-gray-400": "168 162 158",
                "--color-gray-500": "120 113 108",
                "--color-gray-600": "87 83 78",
                "--color-gray-700": "68 64 60",
                "--color-gray-800": "41 37 36",
                "--color-gray-900": "28 25 23",
                "--color-gray-950": "12 10 9",
            },
            "neutral": {
                "--color-gray-50" : "250 250 250",
                "--color-gray-100": "245 245 245",
                "--color-gray-200": "229 229 229",
                "--color-gray-300": "212 212 212",
                "--color-gray-400": "163 163 163",
                "--color-gray-500": "115 115 115",
                "--color-gray-600": "82 82 82",
                "--color-gray-700": "64 64 64",
                "--color-gray-800": "38 38 38",
                "--color-gray-900": "23 23 23",
                "--color-gray-950": "10 10 10",
            },
        };

        if (isGray) {
            const currentGrayMap = {
                "gray": rule.selectors.some(sel => sel.includes('html.has-grayscale-Gray')),
                "slate": rule.selectors.some(sel => sel.includes('html.has-grayscale-Slate')),
                "zinc": rule.selectors.some(sel => sel.includes('html.has-grayscale-Zinc')),
                "stone": rule.selectors.some(sel => sel.includes('html.has-grayscale-Stone')),
                "neutral": rule.selectors.some(sel => sel.includes('html.has-grayscale-Neutral')),
            };
            const currentGrayName = Object.entries(currentGrayMap).filter(e => e[1])[0][0];            
            const currentGray = allGrays[currentGrayName];

            rule.walkDecls((decl) => {
                const grayValue = currentGray[decl.prop.trim()];
                if (grayValue) {
                    decl.value = grayValue;
                }
            });
        }

        const allColors = {
            "--color-red-500": "239 68 68",
            "--color-orange-500": "249 115 22",
            "--color-yellow-500": "240 177 0",
            "--color-amber-500": "245 158 11",
            "--color-green-500": "34 197 94",
            "--color-emerald-50": "236 253 245",
            "--color-emerald-500": "2 44 34",
            "--color-sky-500": "14 165 233",
            "--color-blue-950": "23 37 84",
            "--color-purple-500": "168 85 247",
            "--color-pink-500": "236 72 153",
        };
        
        const isRootOrHost = rule.selectors.some(
            sel => sel.includes(':root') || sel.includes(':host'),
        )

        if (isRootOrHost) {
            rule.walkDecls((decl) => {
                if (decl.prop == '--color-black' && decl.value.includes("#000")) {
                    decl.value = "0 0 0";
                }

                if (decl.prop == '--color-white' && decl.value.includes("#fff")) {
                    decl.value = "255 255 255";
                }

                if (decl.prop.startsWith('--color-gray-') && decl.value.includes('oklch')) {
                    decl.value = allGrays["gray"][decl.prop.trim()];
                }

                if (decl.prop.startsWith('--color-') && decl.value.includes('oklch')) {
                    if (!allColors[decl.prop.trim()]) {
                        throw Error(`No RGB value provided for color ${decl.prop.trim()}`);
                    }
                    decl.value = allColors[decl.prop.trim()];
                }
            })
        } 
        
        // Add rgb() around colors
        rule.walkDecls((decl) => {
            const originalValue = decl.value;
            if (!decl.value.includes("var(--color")) {
                return;
            }

            if (decl.value.includes("var(--color-contrast")) {
                return;
            }

            if (decl.prop.startsWith('--color-')) {
                return;
            }

            const tokens = tokenize({ css: originalValue });
            const replacedRGB = replaceComponentValues(
                parseCommaSeparatedListOfComponentValues(tokens),
                (componentValue) => {
                    if (!isFunctionNode(componentValue) || !/^var$/i.test(componentValue.getName())) {
                        return;
                    }
                    
                    let funcValue = componentValue.toString();
                    if (!funcValue.startsWith("var(--color")) {
                        return;
                    }

                    if (funcValue.startsWith("var(--color-primary")) {
                        return;
                    }

                    const [startIndex,] = sourceIndices(componentValue);
                    const funcBefore = originalValue.substring(startIndex-4, startIndex);
                    
                    if (funcBefore.trim().startsWith('rgb')) {
                        return;
                    }

                    const newValue = `rgb(${funcValue})`;
                    const tokens = tokenize({ css: newValue });
    
                    return parseComponentValue(tokens);
                    
                },
            );            

            const modifiedRGB = stringify(replacedRGB);
            if (modifiedRGB === originalValue) {
                // console.log("[ignored] ", originalValue);
                return;
            }
    
            // console.log("[fixed] ", `(${originalValue})` , modifiedRGB);
            decl.cloneBefore({ value: modifiedRGB });
            decl.remove();            
        });
    });
}

const fixTailwindv4ForLegacyBrowsers = () => {
    return {
        postcssPlugin: 'fixTailwindv4ForLegacyBrowsers',
        Once(root) {
            fixAtProperty(root);
            fixGradientsColorSpace(root);     
            fixColorMix(root);
            fixColors(root);
        },
    }
}

fixTailwindv4ForLegacyBrowsers.postcss = true

export default fixTailwindv4ForLegacyBrowsers;