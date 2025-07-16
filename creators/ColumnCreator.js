class ColumnCreator extends BaseCreator {
    static meta = {
        type: 'column',
        name: 'Add Column',
        steps: 1
    };

    static getUI() {
        return [
            { id: 'height', type: 'number', label: 'Height (mm)', value: 3000 },
            { id: 'profile', type: 'profile', label: 'Profile', value: 'HEA160' },
            { id: 'material', type: 'material', label: 'Material', value: 'S355JR' }
        ];
    }

    execute() {
        const point = this.points[0];
        const params = this.creationManager.getParams();
        this.creationManager.createElement('column', point.clone(), params);
    }

    shouldRestart() {
        return true; // Allow placing multiple columns
    }
} 