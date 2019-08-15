function scrapeHighlights(sp_docToScrape) {
    var reformatedJSON;

    if (sp_docToScrape.querySelector('.bodyContainer')) {
        reformatedJSON = sp_KindleScraper.getHighlights(sp_docToScrape);
    }
    else {
        reformatedJSON = sp_IbookScraper.getHighlights(sp_docToScrape);
    } 

    // Templating and dom manipulation
    var htmlRender = {
            "toc__items": [],
            "sections": []
        },
        sp_sectionEl = document.createElement('article');
    
    sp_sectionEl.classList.add('sp_highlights');

    reformatedJSON.sections.forEach((section, curr) => {
        var toc__item,
            sectionHTML = '',
            notesHTML = [];

        section.notes.forEach((note) => {
            var note = 
            `<p class="sp_note sp_note--${note.level} sp_note--${note.type}">
            <span class="sp_note-level">&bull;</span> ${note.text}
            <span class="sp_note-location">&mdash;Location: <span class="sp_note-location__value">${note.location}</span></span>
            </p>`;
            notesHTML.push(note);
        });

        sectionHTML += `<section class="sp_section" id="sp_section${curr+1}">`;
        sectionHTML += `<h2 class="sp_section-title">${section.sectionTitle} (${section.noteCount})</h2>`;
        sectionHTML += notesHTML.join('');
        sectionHTML += '</section>';

        htmlRender.sections.push(sectionHTML);
        
        toc__item = `<li id="#sp_section${curr+1}-toc">${section.sectionTitle}&nbsp;(${section.noteCount})</li>`;
        htmlRender.toc__items.push(toc__item);
    });

    var sp_header = document.createElement('header');
    sp_header.innerHTML = '<h1 class="sp_title"></h1><p class="sp_author"></p><ol class="sp_toc"></ol>';
    sp_header.querySelector('.sp_title').innerText = reformatedJSON.title; 
    sp_header.querySelector('.sp_author').innerText = 'By: ' + reformatedJSON.authors + ' - Excerpts from: ' + reformatedJSON.source;
    sp_header.querySelector('.sp_toc').innerHTML = htmlRender.toc__items.join('');
    sp_sectionEl.innerHTML = htmlRender.sections.join('');

    sp_sectionEl.insertBefore(sp_header, sp_sectionEl.firstChild);
    document.querySelector('body').append(sp_sectionEl);

    var newDocTitle = 'Highlights from: ' + reformatedJSON.title + ' - ' + reformatedJSON.authors;
    document.title = newDocTitle;
}