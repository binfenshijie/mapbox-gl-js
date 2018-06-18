
import validate from './validate';
import ValidationError from '../error/validation_error';
import getType from '../util/get_type';
import { isFunction } from '../function';
import { unbundle, deepUnbundle } from '../util/unbundle_jsonlint';
import { supportsPropertyExpression } from '../util/properties';

export default function validateProperty(options, propertyType) {
    const key = options.key;
    const style = options.style;
    const styleSpec = options.styleSpec;
    const value = options.value;
    const propertyKey = options.objectKey;
    const layerSpec = styleSpec[`${propertyType}_${options.layerType}`];
    const propsThatRequireSprite = ['background-pattern', 'fill-pattern', 'fill-extrusion-pattern', 'line-pattern', 'icon-image'];

    if (!layerSpec) return [];

    const transitionMatch = propertyKey.match(/^(.*)-transition$/);
    if (propertyType === 'paint' && transitionMatch && layerSpec[transitionMatch[1]] && layerSpec[transitionMatch[1]].transition) {
        return validate({
            key: key,
            value: value,
            valueSpec: styleSpec.transition,
            style: style,
            styleSpec: styleSpec
        });
    }

    const valueSpec = options.valueSpec || layerSpec[propertyKey];
    if (!valueSpec) {
        return [new ValidationError(key, value, `unknown property "${propertyKey}"`)];
    }

    let tokenMatch;
    if (getType(value) === 'string' && supportsPropertyExpression(valueSpec) && !valueSpec.tokens && (tokenMatch = /^{([^}]+)}$/.exec(value))) {
        return [new ValidationError(
            key, value,
            `"${propertyKey}" does not support interpolation syntax\n` +
                `Use an identity property function instead: \`{ "type": "identity", "property": ${JSON.stringify(tokenMatch[1])} }\`.`)];
    }

    const errors = [];

    if (options.layerType === 'symbol') {
        if (propertyKey === 'text-field' && style && !style.glyphs) {
            errors.push(new ValidationError(key, value, 'use of "text-field" requires a style "glyphs" property'));
        }
        if (propertyKey === 'text-font' && isFunction(deepUnbundle(value)) && unbundle(value.type) === 'identity') {
            errors.push(new ValidationError(key, value, '"text-font" does not support identity functions'));
        }
    }

    if (options.layerType === 'background' || options.layerType === 'fill' || options.layerType === 'fill-extrusion' || options.layerType === 'line' || options.layerType === 'symbol') {
        if (propsThatRequireSprite.indexOf(propertyKey) > -1 && style && !style.sprite) {
            errors.push(new ValidationError(key, value, `use of "${propertyKey}" requires a style "sprite" property`));
        }
    }

    return errors.concat(validate({
        key: options.key,
        value: value,
        valueSpec: valueSpec,
        style: style,
        styleSpec: styleSpec,
        expressionContext: 'property',
        propertyType: propertyType,
        propertyKey
    }));
}
