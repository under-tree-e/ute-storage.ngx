import { Objects } from "@interfaces/object";

/**
 * @params tb - Table name
 * @params st - Select values
 * @params wr - Where values
 */
export interface Apis {
    tb?: string;
    st?: string[] | Objects;
    wr?: Objects;
}
