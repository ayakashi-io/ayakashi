import {createQuery} from "../query/query";
import {IAyakashiInstance} from "../prelude";
import {IRenderlessAyakashiInstance} from "../renderlessPrelude";

import debug from "debug";
import {DOMWindow} from "jsdom";
const d = debug("ayakashi:prelude:select");

export function attachQuery(ayakashiInstance: IAyakashiInstance | IRenderlessAyakashiInstance, window?: DOMWindow) {
    ayakashiInstance.select = function(propId?: string) {
        const query = createQuery(ayakashiInstance, {propId, window});
        ayakashiInstance.propRefs[query.id] = query;
        d(`registering prop: ${query.id}`);
        return query;
    };

    ayakashiInstance.selectOne = function(propId?: string) {
        const query = createQuery(ayakashiInstance, {propId, window});
        query.limit(1);
        ayakashiInstance.propRefs[query.id] = query;
        d(`registering prop: ${query.id}`);
        return query;
    };

    //alias of selectOne
    ayakashiInstance.selectFirst = ayakashiInstance.selectOne;

    ayakashiInstance.selectLast = function(propId?: string) {
        const query = createQuery(ayakashiInstance, {propId, window});
        query.limit(1);
        query.order("desc");
        ayakashiInstance.propRefs[query.id] = query;
        d(`registering prop: ${query.id}`);
        return query;
    };
}
