import {createQuery} from "../query/query";
import {IAyakashiInstance} from "../prelude";

import debug from "debug";
const d = debug("ayakashi:prelude:select");

export function attachQuery(ayakashiInstance: IAyakashiInstance) {
    ayakashiInstance.select = function(propId?: string) {
        const query = createQuery(ayakashiInstance, {propId: propId});
        ayakashiInstance.propRefs[query.id] = query;
        d(`registering prop: ${query.id}`);
        return query;
    };

    ayakashiInstance.selectOne = function(propId?: string) {
        const query = createQuery(ayakashiInstance, {propId: propId});
        query.limit(1);
        ayakashiInstance.propRefs[query.id] = query;
        d(`registering prop: ${query.id}`);
        return query;
    };

    //alias of selectOne
    ayakashiInstance.selectFirst = ayakashiInstance.selectOne;

    ayakashiInstance.selectLast = function(propId?: string) {
        const query = createQuery(ayakashiInstance, {propId: propId});
        query.limit(1);
        query.order("desc");
        ayakashiInstance.propRefs[query.id] = query;
        d(`registering prop: ${query.id}`);
        return query;
    };
}
