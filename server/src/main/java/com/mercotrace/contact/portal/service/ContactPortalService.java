package com.mercotrace.contact.portal.service;

import com.mercotrace.contact.portal.service.dto.ContactPortalArrivalDTO;
import com.mercotrace.contact.portal.service.dto.ContactPortalProfileUpdateDTO;
import com.mercotrace.contact.portal.service.dto.ContactPortalPurchaseDTO;
import com.mercotrace.contact.portal.service.dto.ContactPortalStatementDTO;
import com.mercotrace.domain.ArApDocument;
import com.mercotrace.domain.SellerInVehicle;
import com.mercotrace.domain.StockPurchase;
import com.mercotrace.domain.Vehicle;
import com.mercotrace.domain.enumeration.ArApType;
import com.mercotrace.repository.ArApDocumentRepository;
import com.mercotrace.repository.ContactRepository;
import com.mercotrace.repository.SellerInVehicleRepository;
import com.mercotrace.repository.StockPurchaseRepository;
import com.mercotrace.repository.VehicleRepository;
import com.mercotrace.service.ContactIdentityService;
import com.mercotrace.service.dto.ContactDTO;
import com.mercotrace.service.mapper.ContactMapper;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/**
 * Service layer for Contact Portal read/write operations.
 *
 * All methods are scoped by contactId and never expose data
 * for any other contact.
 */
@Service
@Transactional
public class ContactPortalService {

    private static final Logger LOG = LoggerFactory.getLogger(ContactPortalService.class);

    private final ContactRepository contactRepository;
    private final ContactMapper contactMapper;
    private final ArApDocumentRepository arApDocumentRepository;
    private final StockPurchaseRepository stockPurchaseRepository;
    private final SellerInVehicleRepository sellerInVehicleRepository;
    private final VehicleRepository vehicleRepository;
    private final PasswordEncoder passwordEncoder;
    private final ContactIdentityService contactIdentityService;

    public ContactPortalService(
        ContactRepository contactRepository,
        ContactMapper contactMapper,
        ArApDocumentRepository arApDocumentRepository,
        StockPurchaseRepository stockPurchaseRepository,
        SellerInVehicleRepository sellerInVehicleRepository,
        VehicleRepository vehicleRepository,
        PasswordEncoder passwordEncoder,
        ContactIdentityService contactIdentityService
    ) {
        this.contactRepository = contactRepository;
        this.contactMapper = contactMapper;
        this.arApDocumentRepository = arApDocumentRepository;
        this.stockPurchaseRepository = stockPurchaseRepository;
        this.sellerInVehicleRepository = sellerInVehicleRepository;
        this.vehicleRepository = vehicleRepository;
        this.passwordEncoder = passwordEncoder;
        this.contactIdentityService = contactIdentityService;
    }

    @Transactional(readOnly = true)
    public List<ContactPortalStatementDTO> getStatementsForContact(Long contactId, int limit) {
        LOG.debug("Fetching AR/AP statements for contactId={}", contactId);
        var pageRequest = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "documentDate"));
        return arApDocumentRepository
            .findAllByContact_Id(contactId, pageRequest)
            .getContent()
            .stream()
            .map(this::toStatementDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ContactPortalStatementDTO> getSettlementsForContact(Long contactId, int limit) {
        LOG.debug("Fetching AP (settlements) documents for contactId={}", contactId);
        var pageRequest = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "documentDate"));
        return arApDocumentRepository
            .findAllByContact_IdAndType(contactId, ArApType.AP, pageRequest)
            .getContent()
            .stream()
            .map(this::toStatementDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ContactPortalPurchaseDTO> getPurchasesForContact(Long contactId, int limit) {
        LOG.debug("Fetching stock purchases for contactId={}", contactId);
        var pageRequest = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "purchaseDate"));
        return stockPurchaseRepository
            .findAllByVendorIdAndIsDeletedFalse(contactId, pageRequest)
            .getContent()
            .stream()
            .map(this::toPurchaseDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ContactPortalArrivalDTO> getArrivalsForContact(Long contactId, int limit) {
        LOG.debug("Fetching arrivals for contactId={}", contactId);
        List<SellerInVehicle> links = sellerInVehicleRepository.findAllByContactIdOrBrokerId(contactId, contactId);
        if (links.isEmpty()) {
            return Collections.emptyList();
        }
        List<Long> vehicleIds = links.stream().map(SellerInVehicle::getVehicleId).distinct().collect(Collectors.toList());
        List<Vehicle> vehicles = vehicleRepository.findAllById(vehicleIds);
        Map<Long, Vehicle> vehicleById = vehicles.stream().collect(Collectors.toMap(Vehicle::getId, v -> v));

        return links
            .stream()
            .sorted((a, b) -> {
                Vehicle va = vehicleById.get(a.getVehicleId());
                Vehicle vb = vehicleById.get(b.getVehicleId());
                if (va == null || vb == null || va.getArrivalDatetime() == null || vb.getArrivalDatetime() == null) {
                    return 0;
                }
                return vb.getArrivalDatetime().compareTo(va.getArrivalDatetime());
            })
            .limit(limit)
            .map(link -> toArrivalDto(link, vehicleById.get(link.getVehicleId())))
            .collect(Collectors.toList());
    }

    public ContactDTO updateProfile(Long contactId, ContactPortalProfileUpdateDTO update) {
        return contactRepository
            .findById(contactId)
            .map(contact -> {
                if (update.getName() != null && !update.getName().isBlank()) {
                    contact.setName(update.getName().trim());
                }
                if (update.getEmail() != null) {
                    String normalizedEmail = contactIdentityService.normalizeEmail(update.getEmail());
                    if (normalizedEmail != null && !normalizedEmail.isBlank()) {
                        contactIdentityService.assertNoLoginConflictForEmailUpdate(contactId, normalizedEmail);
                        contact.setEmail(normalizedEmail);
                    }
                }
                if (update.getAddress() != null) {
                    contact.setAddress(update.getAddress());
                }
                if (update.getNewPassword() != null && !update.getNewPassword().isBlank()) {
                    if (update.getCurrentPassword() == null || update.getCurrentPassword().isBlank()) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is required");
                    }
                    if (contact.getPasswordHash() == null || !passwordEncoder.matches(update.getCurrentPassword(), contact.getPasswordHash())) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
                    }
                    contact.setPasswordHash(passwordEncoder.encode(update.getNewPassword()));
                    contact.setCanLogin(true);
                }

                return contactMapper.toDto(contactRepository.save(contact));
            })
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Contact not found"));
    }

    private ContactPortalStatementDTO toStatementDto(ArApDocument d) {
        ContactPortalStatementDTO dto = new ContactPortalStatementDTO();
        dto.setDocumentId(d.getId() != null ? d.getId().toString() : null);
        dto.setTraderId(d.getTraderId() != null ? d.getTraderId().toString() : null);
        dto.setType(d.getType());
        dto.setReferenceNumber(d.getReferenceNumber());
        dto.setOriginalAmount(d.getOriginalAmount() != null ? d.getOriginalAmount() : BigDecimal.ZERO);
        dto.setOutstandingBalance(d.getOutstandingBalance() != null ? d.getOutstandingBalance() : BigDecimal.ZERO);
        dto.setStatus(d.getStatus());
        dto.setDocumentDate(d.getDocumentDate());
        return dto;
    }

    private ContactPortalPurchaseDTO toPurchaseDto(StockPurchase sp) {
        ContactPortalPurchaseDTO dto = new ContactPortalPurchaseDTO();
        dto.setPurchaseId(sp.getId() != null ? sp.getId().toString() : null);
        dto.setTraderId(sp.getTraderId() != null ? sp.getTraderId().toString() : null);
        dto.setPurchaseDate(sp.getPurchaseDate());
        dto.setTotalAmount(sp.getTotalAmount());
        return dto;
    }

    private ContactPortalArrivalDTO toArrivalDto(SellerInVehicle link, Vehicle vehicle) {
        ContactPortalArrivalDTO dto = new ContactPortalArrivalDTO();
        dto.setSellerVehicleId(link.getId() != null ? link.getId().toString() : null);
        if (vehicle != null) {
            dto.setVehicleId(vehicle.getId() != null ? vehicle.getId().toString() : null);
            dto.setTraderId(vehicle.getTraderId() != null ? vehicle.getTraderId().toString() : null);
            dto.setVehicleNumber(vehicle.getVehicleNumber());
            dto.setArrivalDatetime(vehicle.getArrivalDatetime());
        }
        return dto;
    }
}
