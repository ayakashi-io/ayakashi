export default function() {
    ["height", "width"].forEach(property => {
        // store the existing descriptor
        const imageDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, property);

        // redefine the property with a patched descriptor
        Object.defineProperty(HTMLImageElement.prototype, property, {
            ...imageDescriptor,
            get: function() {
                // return an arbitrary non-zero dimension if the image failed to load
                //tslint:disable
                if (this.complete && this.naturalHeight == 0) {
                    return 16;
                }
                //tslint:enable
                // otherwise, return the actual dimension
                //@ts-ignore
                return imageDescriptor.get.apply(this);
            }
        });
    });
}
