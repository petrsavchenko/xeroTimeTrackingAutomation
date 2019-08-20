{const userId = 'fb272868-027b-4c7e-b813-b8769c608724';
const yourTimeEntries = [{
    name: 'Other',
    hours: 0.5,
    description: 'Scrum Daily Meeting'
}, {
    name: 'Consulting',
    hours: 3.5,
    description: 'Team support (consultations, tech design, issues investigation, priorities confirmation and etc)'
}, {
    name: 'Bug Development',
    hours: 2,
}, {
    name: 'Feature Development',
    hours: 2,
}];

const startDate = new Date("08/01/2019");
const endDate = new Date("08/02/2019");

var url = 'https://projects.xero.com/api/projects/db637125-7cd6-4022-a56f-d991712f4cad/time';
const getTasksUrl = 'https://projects.xero.com/api/projects/db637125-7cd6-4022-a56f-d991712f4cad/tasks';

function getTasks() {
    return fetch(getTasksUrl);
}

function getData(stringDateUtc, tasks, yourTimeEntries) {
    const data = [];
    yourTimeEntries.forEach(timeEntry => {
        const task = tasks.find(task => task.name === timeEntry.name);
        if (!task){
            throw Error("Task is not found")
        }
        data.push({
            taskId: task.taskId,
            userId: userId,
            duration: timeEntry.hours * 60,
            description: timeEntry.description,
            dateUtc: stringDateUtc
        })
    });
    return data;
}

function postDateTimeEntry(dayTimeEntry) {
    return fetch(url, {
        method: 'POST', // or 'PUT'
        body: JSON.stringify(dayTimeEntry), // data can be `string` or {object}!
        headers:{
          'Content-Type': 'application/json'
        }
      })
}

async function postTimeEntries() {
    let tasks;
    try {
        const tasksPromise = await getTasks();
        const tasksResponse = await tasksPromise.json();
        tasks = tasksResponse.items;
    } catch(e) {
        new Error(`Cannot get tasks\n ${e}`);
    }

    let timeEntryPromises = []; // {promise, data}

    for (let date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayTimeEntries = getData(date.toISOString(), tasks, yourTimeEntries);
        dayTimeEntries.forEach(dayTimeEntry => {
            timeEntryPromises.push({promise: postDateTimeEntry(dayTimeEntry), data: dayTimeEntry});
        });
    }
    while (timeEntryPromises.length > 0) {
        const results = await Promise.all(timeEntryPromises.map(p => p.promise.catch(e => e)));
    
        const failedPromises = results.filter(result => result.status != 201);

        let tryAgainTimeEntryPromises = []
        failedPromises.forEach(invalidResult => {
            const posInvalidResult = results.indexOf(invalidResult);
            tryAgainTimeEntryPromises.push(timeEntryPromises[posInvalidResult]);
        });

        timeEntryPromises = tryAgainTimeEntryPromises;

        timeEntryPromises.forEach(timeEntryPromise => {
            const newAttemptPromise = postDateTimeEntry(timeEntryPromise.data);
            timeEntryPromise.promise = newAttemptPromise;
            console.log(`Trying to add time entry again for ${JSON.stringify(timeEntryPromise.data)}`);
        });
    }
    alert('All your time tracking records have been added');
}

postTimeEntries();
}