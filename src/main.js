import {
    LogManager
}
from 'aurelia-framework';
import {
    ConsoleAppender
}
from 'aurelia-logging-console';

LogManager.addAppender(new ConsoleAppender());
LogManager.setLevel(LogManager.levels.debug);

export function configure(aurelia) {
	logger = LogManager.getLogger("kloudspeaker");
	logger.info("Kloudspeaker starting");

    aurelia.use
        .defaultBindingLanguage()
        .defaultResources()
        .router()
        .eventAggregator();

    aurelia.start().then(a => a.setRoot('app', document.getElementById('kloudspeaker')));
}
