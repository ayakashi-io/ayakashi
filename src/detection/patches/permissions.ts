export default function() {
    //@ts-ignore
    const originalQuery = window.navigator.permissions.query;
    //@ts-ignore
    window.navigator.permissions.query = (parameters) => (
        parameters.name === "notifications" ?
            Promise.resolve({state: Notification.permission}) :
            originalQuery(parameters)
        );
}
